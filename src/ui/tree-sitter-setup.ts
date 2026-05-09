import { addDefaultParsers } from '@opentui/core'
import bashWasm from 'tree-sitter-wasms/out/tree-sitter-bash.wasm' with { type: 'file' }
import jsonWasm from 'tree-sitter-wasms/out/tree-sitter-json.wasm' with { type: 'file' }
import pythonWasm from 'tree-sitter-wasms/out/tree-sitter-python.wasm' with { type: 'file' }
import bashHighlights from '../grammars/bash/highlights.scm' with { type: 'file' }
import jsonHighlights from '../grammars/json/highlights.scm' with { type: 'file' }
import pythonHighlights from '../grammars/python/highlights.scm' with { type: 'file' }

addDefaultParsers([
  {
    filetype: 'python',
    aliases: ['py'],
    wasm: pythonWasm,
    queries: { highlights: [pythonHighlights] },
  },
  {
    filetype: 'json',
    wasm: jsonWasm,
    queries: { highlights: [jsonHighlights] },
  },
  {
    filetype: 'bash',
    aliases: ['sh', 'shell', 'zsh'],
    wasm: bashWasm,
    queries: { highlights: [bashHighlights] },
  },
])
