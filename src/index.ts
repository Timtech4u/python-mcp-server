#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import { exec, spawn } from 'child_process';
import { writeFile, readFile, access, mkdir, readdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { constants } from 'fs';

const execAsync = promisify(exec);

// Check if Python is installed
async function checkPythonInstalled(): Promise<boolean> {
  try {
    await execAsync('python --version');
    return true;
  } catch (error) {
    try {
      await execAsync('python3 --version');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Get the correct Python command (python or python3)
async function getPythonCommand(): Promise<string> {
  try {
    await execAsync('python --version');
    return 'python';
  } catch (error) {
    try {
      await execAsync('python3 --version');
      return 'python3';
    } catch (error) {
      throw new Error('Python is not installed');
    }
  }
}

// Check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// Ensure directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await access(dirPath, constants.F_OK);
  } catch (error) {
    await mkdir(dirPath, { recursive: true });
  }
}

class PythonMcpServer {
  private server: Server;
  private pythonCommand: string = 'python';
  private pythonInstalled: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: 'python-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error: any) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      await this.checkPythonStatus();
      
      return {
        tools: [
          // Code Execution Tools
          {
            name: 'execute_python_code',
            description: 'Execute Python code snippet',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'The Python code to execute'
                },
                timeout: {
                  type: 'number',
                  description: 'Maximum execution time in seconds',
                  default: 30
                },
                args: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Command line arguments to pass to the script',
                  default: []
                },
                workingDir: {
                  type: 'string',
                  description: 'Working directory for the script execution',
                  default: ''
                }
              },
              required: ['code']
            }
          },
          {
            name: 'execute_python_file',
            description: 'Execute a Python file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Python file to execute'
                },
                timeout: {
                  type: 'number',
                  description: 'Maximum execution time in seconds',
                  default: 30
                },
                args: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Command line arguments to pass to the script',
                  default: []
                },
                workingDir: {
                  type: 'string',
                  description: 'Working directory for the script execution',
                  default: ''
                }
              },
              required: ['filePath']
            }
          },
          {
            name: 'check_python_version',
            description: 'Check the installed Python version',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          
          // File Management Tools
          {
            name: 'list_python_files',
            description: 'List Python files in a directory',
            inputSchema: {
              type: 'object',
              properties: {
                dirPath: {
                  type: 'string',
                  description: 'Directory path to list Python files from',
                  default: '.'
                },
                recursive: {
                  type: 'boolean',
                  description: 'Whether to search recursively',
                  default: false
                }
              }
            }
          },
          {
            name: 'read_python_file',
            description: 'Read the content of a Python file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Python file to read'
                }
              },
              required: ['filePath']
            }
          },
          {
            name: 'write_python_file',
            description: 'Write content to a Python file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Python file to write'
                },
                content: {
                  type: 'string',
                  description: 'Content to write to the file'
                },
                createDirs: {
                  type: 'boolean',
                  description: 'Create directories if they do not exist',
                  default: true
                }
              },
              required: ['filePath', 'content']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      await this.checkPythonStatus();
      
      if (!this.pythonInstalled) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Python is not installed. Please install Python from https://www.python.org/downloads/'
            }
          ],
          isError: true
        };
      }

      const toolName = request.params.name;
      const args = request.params.arguments;

      try {
        switch (toolName) {
          // Code Execution Tools
          case 'execute_python_code':
            return await this.executePythonCode(args);
          case 'execute_python_file':
            return await this.executePythonFile(args);
          case 'check_python_version':
            return await this.checkPythonVersion();
            
          // File Management Tools
          case 'list_python_files':
            return await this.listPythonFiles(args);
          case 'read_python_file':
            return await this.readPythonFile(args);
          case 'write_python_file':
            return await this.writePythonFile(args);
            
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${toolName}`
            );
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async checkPythonStatus() {
    this.pythonInstalled = await checkPythonInstalled();
    if (this.pythonInstalled) {
      this.pythonCommand = await getPythonCommand();
    }
  }

  // Code Execution Methods
  
  private async executePythonCode(args: any) {
    const { code, timeout = 30, args: scriptArgs = [], workingDir = '' } = args;
    
    if (!code) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No code provided'
          }
        ],
        isError: true
      };
    }

    // Create a temporary file with the code
    const tempDir = tmpdir();
    const filename = `python-${uuidv4()}.py`;
    const filepath = join(tempDir, filename);
    
    await writeFile(filepath, code);
    
    // Execute the code
    return this.executePythonScript(filepath, timeout, scriptArgs, workingDir);
  }

  private async executePythonFile(args: any) {
    const { filePath, timeout = 30, args: scriptArgs = [], workingDir = '' } = args;
    
    if (!filePath) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No file path provided'
          }
        ],
        isError: true
      };
    }

    // Check if the file exists
    const fileExistsResult = await fileExists(filePath);
    if (!fileExistsResult) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: File not found: ${filePath}`
          }
        ],
        isError: true
      };
    }

    // Execute the file
    return this.executePythonScript(filePath, timeout, scriptArgs, workingDir);
  }

  private async executePythonScript(scriptPath: string, timeout: number, scriptArgs: string[] = [], workingDir: string = '') {
    const cwd = workingDir || process.cwd();
    
    return new Promise<any>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      
      const pythonProcess = spawn(this.pythonCommand, [scriptPath, ...scriptArgs], { cwd });
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        pythonProcess.kill();
      }, timeout * 1000);
      
      // Collect stdout
      pythonProcess.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });
      
      // Collect stderr
      pythonProcess.stderr.on('data', (data: any) => {
        stderr += data.toString();
      });
      
      // Handle process completion
      pythonProcess.on('close', (code: any) => {
        clearTimeout(timeoutId);
        
        if (timedOut) {
          resolve({
            content: [
              {
                type: 'text',
                text: `Error: Script execution timed out after ${timeout} seconds`
              }
            ],
            isError: true
          });
          return;
        }
        
        if (code !== 0) {
          resolve({
            content: [
              {
                type: 'text',
                text: `Error (exit code ${code}):\n${stderr}`
              }
            ],
            isError: true
          });
          return;
        }
        
        resolve({
          content: [
            {
              type: 'text',
              text: stdout ? `Output:\n${stdout}` : 'Script executed successfully with no output.'
            },
            ...(stderr ? [{ type: 'text', text: `Warnings/Messages:\n${stderr}` }] : [])
          ]
        });
      });
    });
  }

  private async checkPythonVersion() {
    try {
      const { stdout } = await execAsync(`${this.pythonCommand} --version && ${this.pythonCommand} -c "import sys; print('Python path:', sys.executable); print('Packages directory:', sys.path)"`, { timeout: 5000 });
      return {
        content: [
          {
            type: 'text',
            text: `Python Information:\n${stdout}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking Python version: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // File Management Methods
  
  private async listPythonFiles(args: any) {
    const { dirPath = '.', recursive = false } = args;
    
    try {
      const files = await this.findPythonFiles(dirPath, recursive);
      
      if (files.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No Python files found in ${dirPath}`
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `Python files in ${dirPath}:\n${files.join('\n')}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing Python files: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async findPythonFiles(dirPath: string, recursive: boolean): Promise<string[]> {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    let files: string[] = [];
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        const subFiles = await this.findPythonFiles(fullPath, recursive);
        files = [...files, ...subFiles];
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async readPythonFile(args: any) {
    const { filePath } = args;
    
    if (!filePath) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No file path provided'
          }
        ],
        isError: true
      };
    }

    try {
      // Check if the file exists
      const fileExistsResult = await fileExists(filePath);
      if (!fileExistsResult) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: File not found: ${filePath}`
            }
          ],
          isError: true
        };
      }

      // Read the file
      const content = await readFile(filePath, 'utf-8');
      
      return {
        content: [
          {
            type: 'text',
            text: `File: ${filePath}\n\n\`\`\`python\n${content}\n\`\`\``
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async writePythonFile(args: any) {
    const { filePath, content, createDirs = true } = args;
    
    if (!filePath) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No file path provided'
          }
        ],
        isError: true
      };
    }

    if (content === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No content provided'
          }
        ],
        isError: true
      };
    }

    try {
      // Create directories if needed
      if (createDirs) {
        const dir = dirname(filePath);
        await ensureDirectoryExists(dir);
      }

      // Write the file
      await writeFile(filePath, content);
      
      return {
        content: [
          {
            type: 'text',
            text: `File successfully written to ${filePath}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error writing file: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Python MCP server running on stdio');
  }
}

// Run the server
const server = new PythonMcpServer();
server.run().catch((error) => {
  console.error('Error running server:', error);
  process.exit(1);
});
