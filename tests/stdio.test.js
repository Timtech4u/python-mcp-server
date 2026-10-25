import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const text = (result) => result.content.filter((item) => item.type === 'text').map((item) => item.text).join('\n');

test('stdio client can discover tools, execute Python and round-trip files', { timeout: 20000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'python-mcp-test-'));
  const client = new Client({ name: 'security-upgrade-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
    stderr: 'pipe',
  });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    for (const name of ['execute_python_code', 'execute_python_file', 'check_python_version', 'list_python_files', 'read_python_file', 'write_python_file']) {
      assert.ok(tools.tools.some((tool) => tool.name === name), name);
    }
    const info = await client.callTool({ name: 'check_python_version', arguments: {} });
    assert.notEqual(info.isError, true);
    assert.match(text(info), /Python [3-9]\./);
    const filePath = join(directory, 'hello.py');
    const write = await client.callTool({ name: 'write_python_file', arguments: { filePath, content: 'import sys\nprint("hello " + sys.argv[1])\n' } });
    assert.notEqual(write.isError, true);
    const read = await client.callTool({ name: 'read_python_file', arguments: { filePath } });
    assert.match(text(read), /print\("hello "/);
    const listing = await client.callTool({ name: 'list_python_files', arguments: { dirPath: directory } });
    assert.ok(text(listing).includes(filePath));
    const executed = await client.callTool({ name: 'execute_python_file', arguments: { filePath, args: ['world'], workingDir: directory } });
    assert.notEqual(executed.isError, true);
    assert.match(text(executed), /hello world/);
    const code = await client.callTool({ name: 'execute_python_code', arguments: { code: 'print(6 * 7)', workingDir: directory } });
    assert.notEqual(code.isError, true);
    assert.match(text(code), /42/);
    const missing = await client.callTool({ name: 'read_python_file', arguments: { filePath: join(directory, 'missing.py') } });
    assert.equal(missing.isError, true);
  } finally {
    await client.close();
    await rm(directory, { recursive: true, force: true });
  }
});
