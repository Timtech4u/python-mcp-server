# Python MCP Server

A Model Context Protocol (MCP) server for executing Python code and managing Python environments. This server allows Claude and other LLMs to run Python code, manage files, and work with Python packages.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/Timtech4u/python-mcp-server-)

## Features

- **Code Execution**: Run Python code snippets or execute Python files
- **File Management**: List, read, and write Python files
- **Python Environment**: Check Python version and environment details
- **Configurable Execution**: Set timeouts, working directories, and command-line arguments

## Prerequisites

Before using this MCP server, ensure you have:

- [Node.js](https://nodejs.org/) 16 or higher installed
- [Python](https://www.python.org/downloads/) installed and available in your PATH
- [Claude Desktop](https://claude.ai/download) or [Cline](https://github.com/saoudrizwan/cline) installed

## Installation

1. Clone this repository:
```bash
git clone https://github.com/Timtech4u/python-mcp-server-.git
cd python-mcp-server-
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### For Claude Desktop

1. Open your Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the Python MCP server configuration:
```json
{
  "mcpServers": {
    "python": {
      "command": "node",
      "args": [
        "/absolute/path/to/python-mcp-server/dist/index.js"
      ],
      "disabled": false,
      "autoApprove": [
        "execute_python_code",
        "execute_python_file",
        "check_python_version",
        "list_python_files",
        "read_python_file",
        "write_python_file"
      ]
    }
  }
}
```

3. Replace `/absolute/path/to/python-mcp-server` with the actual path where you cloned the repository.

4. Restart Claude Desktop.

### For Cline

1. Open your Cline MCP settings file:
   - macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

2. Add the Python MCP server configuration:
```json
{
  "mcpServers": {
    "python": {
      "command": "node",
      "args": [
        "/absolute/path/to/python-mcp-server/dist/index.js"
      ],
      "disabled": false,
      "autoApprove": [
        "execute_python_code",
        "execute_python_file",
        "check_python_version",
        "list_python_files",
        "read_python_file",
        "write_python_file"
      ]
    }
  }
}
```

3. Replace `/absolute/path/to/python-mcp-server` with the actual path where you cloned the repository.

4. Restart Cline or reload the window.

## How to Use

Once configured, you can ask Claude to run Python code in various ways. Here are some examples:

### Execute Python Code

```
Can you run this Python code for me?

import random
numbers = [random.randint(1, 100) for _ in range(10)]
print(f"Random numbers: {numbers}")
print(f"Sum: {sum(numbers)}")
print(f"Average: {sum(numbers)/len(numbers)}")
```

### Execute a Python File

```
Can you execute my Python file at /path/to/my_script.py?
```

### List Python Files

```
Can you list all Python files in my /path/to/project directory?
```

### Read a Python File

```
Can you show me the contents of /path/to/my_script.py?
```

### Write a Python File

```
Can you create a Python file at /path/to/new_script.py with the following content?

def hello_world():
    print("Hello, world!")

if __name__ == "__main__":
    hello_world()
```

### Check Python Version

```
What version of Python do I have installed?
```

## Available Tools

### execute_python_code

Executes Python code snippets.

Parameters:
- `code` (string, required): The Python code to execute
- `timeout` (number, optional): Maximum execution time in seconds (default: 30)
- `args` (array of strings, optional): Command line arguments to pass to the script
- `workingDir` (string, optional): Working directory for the script execution

### execute_python_file

Executes a Python file.

Parameters:
- `filePath` (string, required): Path to the Python file to execute
- `timeout` (number, optional): Maximum execution time in seconds (default: 30)
- `args` (array of strings, optional): Command line arguments to pass to the script
- `workingDir` (string, optional): Working directory for the script execution

### check_python_version

Returns information about the installed Python version.

### list_python_files

Lists Python files in a directory.

Parameters:
- `dirPath` (string, optional): Directory path to list Python files from (default: current directory)
- `recursive` (boolean, optional): Whether to search recursively (default: false)

### read_python_file

Reads the content of a Python file.

Parameters:
- `filePath` (string, required): Path to the Python file to read

### write_python_file

Writes content to a Python file.

Parameters:
- `filePath` (string, required): Path to the Python file to write
- `content` (string, required): Content to write to the file
- `createDirs` (boolean, optional): Create directories if they do not exist (default: true)

## Troubleshooting

### Python Not Found

If you see an error like "Python is not installed", make sure Python is installed and available in your system PATH.

### Permission Errors

If you encounter permission errors when reading or writing files, make sure the user running the MCP server has the necessary permissions.

### Timeout Errors

The server has a default 30-second timeout for code execution. If your code takes longer than that, it will be terminated. You can increase the timeout by specifying the `timeout` parameter.

## License

MIT
