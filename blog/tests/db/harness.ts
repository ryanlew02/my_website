import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const migrationsDir = join(here, '../../supabase/migrations');

export interface Db {
    pg: PGlite;
    /** Run SQL as a given user (uuid), as `anon` (null), or as the table owner ('owner'). */
    as<T = Record<string, unknown>>(who: string | null | 'owner', sql: string, params?: unknown[]): Promise<T[]>;
    /** Like `as`, but resolves to the error message (or null if it succeeded). */
    fails(who: string | null | 'owner', sql: string, params?: unknown[]): Promise<string | null>;
    createUser(meta?: Record<string, unknown>, email?: string, google?: { sub: string }): Promise<string>;
    makeAdmin(id: string): Promise<void>;
}

export async function freshDb(): Promise<Db> {
    const pg = new PGlite();
    await pg.exec(readFileSync(join(here, 'supabase-shim.sql'), 'utf8'));
    for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
        await pg.exec(readFileSync(join(migrationsDir, f), 'utf8'));
    }

    async function as<T>(who: string | null | 'owner', sql: string, params: unknown[] = []): Promise<T[]> {
        return pg.transaction(async (tx) => {
            if (who !== 'owner') {
                const claims = who ? JSON.stringify({ sub: who, role: 'authenticated' }) : '';
                await tx.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
                await tx.exec(`set local role ${who ? 'authenticated' : 'anon'}`);
            }
            const res = await tx.query<T>(sql, params);
            return res.rows;
        });
    }

    async function fails(who: string | null | 'owner', sql: string, params: unknown[] = []) {
        try {
            await as(who, sql, params);
            return null;
        } catch (e) {
            return (e as Error).message;
        }
    }

    let n = 0;
    /** Signs a user up the way Supabase OAuth does: a users row, then its identity. */
    async function createUser(meta: Record<string, unknown> = {}, email?: string, google = { sub: `google-${n + 1}` }) {
        n += 1;
        const mail = email ?? `user${n}@example.com`;
        const rows = await as<{ id: string }>(
            'owner',
            `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
            [mail, JSON.stringify(meta)],
        );
        await as('owner',
            `insert into auth.identities (user_id, provider, provider_id, identity_data) values ($1, 'google', $2, $3)`,
            [rows[0].id, google.sub, JSON.stringify({ sub: google.sub, email: mail })]);
        return rows[0].id;
    }

    async function makeAdmin(id: string) {
        await as('owner', `insert into public.user_roles (user_id, role) values ($1, 'admin')`, [id]);
    }

    return { pg, as, fails, createUser, makeAdmin };
}
