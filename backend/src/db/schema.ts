export const schemaStatements = [
  `create table if not exists accounts (
    id integer primary key autoincrement,
    name text not null unique,
    kind text not null,
    currency text not null,
    initial_balance real not null default 0,
    credit_limit real not null default 0,
    is_system integer not null default 1,
    is_active integer not null default 1,
    created_at text not null,
    updated_at text not null
  )`,
  `create table if not exists transactions (
    id integer primary key autoincrement,
    type text not null,
    title text not null,
    note text not null default '',
    amount real not null,
    currency text not null,
    source_account_id integer,
    target_account_id integer,
    category text not null default '',
    occurred_at text not null,
    created_at text not null,
    deleted_at text,
    origin text not null default 'manual',
    ai_input_text text not null default '',
    foreign key(source_account_id) references accounts(id),
    foreign key(target_account_id) references accounts(id)
  )`,
  `create table if not exists settings (
    id integer primary key check (id = 1),
    cny_to_jpy_rate real not null default 20,
    jpy_to_cny_rate real not null default 0.05,
    ai_endpoint_url text not null default '',
    ai_api_key text not null default '',
    ai_protocol text not null default 'chat_completions',
    ai_model text not null default '',
    updated_at text not null
  )`,
  `create table if not exists ai_parse_logs (
    id integer primary key autoincrement,
    input_text text not null,
    parsed_json text not null default '',
    raw_response text not null default '',
    success integer not null default 0,
    error_message text not null default '',
    created_at text not null
  )`,
];
