const url = 'https://nooljfpynicvckfbsaba.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb2xqZnB5bmljdmNrZmJzYWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg5NDE1NiwiZXhwIjoyMDg4NDcwMTU2fQ.5amM0Q7huBUJ5rDmgSo9oWI27OibirwEYj_dKvJ1sSs'

async function main() {
  // Try all possible SQL execution endpoints
  const sql = `CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())`

  const endpoints = [
    { path: '/rest/v1/rpc/exec_sql', body: { sql } },
    { path: '/rest/v1/rpc/execute_sql', body: { query: sql } },
  ]

  for (const ep of endpoints) {
    const res = await fetch(url + ep.path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(ep.body),
    })
    const text = await res.text()
    console.log(`${ep.path}: ${res.status} ${text.slice(0, 150)}`)
  }

  // Alternative: just try to insert into system_config via REST API
  // If table exists, this will work. If not, it'll fail.
  console.log('\nTrying direct insert via REST...')
  const insertRes = await fetch(`${url}/rest/v1/system_config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key: 'company_promptpay', value: '0994569544' }),
  })
  const insertText = await insertRes.text()
  console.log(`INSERT: ${insertRes.status} ${insertText.slice(0, 200)}`)

  if (insertRes.status === 201 || insertRes.status === 200) {
    console.log('\n✅ Table exists and data inserted!')
  } else {
    console.log('\n❌ Table does not exist. Checking if we can read...')
    const readRes = await fetch(`${url}/rest/v1/system_config?select=*`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    })
    console.log(`READ: ${readRes.status} ${await readRes.text()}`)
  }
}

main()
