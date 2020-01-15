/// <reference types='../../../../node_modules/monaco-editor/monaco' />

import { IDefinitions } from '../../../store/pnpjsconsole/types'

export const getDirectory = (dirEntry: DirectoryEntry, path: string): Promise<DirectoryEntry> => {
  return new Promise(resolve => dirEntry.getDirectory(path, {}, (entry: DirectoryEntry) => resolve(entry)))
}

export const readDirRecursive = async (
  entry: DirectoryEntry,
  files: DirectoryEntry[] = [],
) => {
  const entries = await readEntries(entry)

  for (const key in entries) {
    if (entries[key].isDirectory) {
      await readDirRecursive(entries[key] as DirectoryEntry, files)
    } else {
      files.push(entries[key])
    }
  }

  return files
}

export const readEntries = (dir: DirectoryEntry): Promise<DirectoryEntry[]> => {
  return new Promise(resolve => {
    const reader = dir.createReader()
    reader.readEntries(entries => resolve(entries as any))
  })
}

export const loadDefinitions = async (
  directoryEntry: DirectoryEntry,
  dir: string[],
) => {
  return new Promise<IDefinitions[]>(async resolve => {
    const declarations: Array<{ content: string; filePath: string | undefined }> = []
    await Promise.all(dir.map(async di => {
      const subDirectoryEntry = await getDirectory(directoryEntry, di.replace('/crxfs', ''))
      const entries = await readDirRecursive(subDirectoryEntry)
      for (const entry of entries) {
        const fullpath = entry.fullPath.replace('/crxfs/', '')
        const file = await fetch(fullpath)
        const content = await file.text()
        if (fullpath.endsWith('/index.d.ts')) {
          const newPath = fullpath.replace('/index.d.ts', '.d.ts')
          const newContent = `export * from "./${newPath.substring(newPath.lastIndexOf('/') + 1).replace('.d.ts', '')}/index";`
          declarations.push({ content: newContent, filePath: newPath })
        }
        declarations.push({ content, filePath: fullpath })
      }
    }))
    monaco.languages.typescript.typescriptDefaults.setExtraLibs(declarations)
    resolve(declarations)
  })
}

export const getExtensionDirectory = (): Promise<DirectoryEntry> =>
  new Promise(resolve => chrome.runtime.getPackageDirectoryEntry(resolve))

export const pnpjsMonacoConfigs = () => {
  const COMMON_CONFIG: monaco.editor.IStandaloneEditorConstructionOptions = {
    lineNumbers: 'on',
    roundedSelection: true,
    scrollBeyondLastLine: false,
    readOnly: false,
    fontSize: 16,
    renderIndentGuides: true,
    suggestOnTriggerCharacters: true,
    colorDecorators: true,
    automaticLayout: true,
  }
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES5,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.Classic,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    typeRoots: [],
    allowSyntheticDefaultImports: true,
  })
  return COMMON_CONFIG
}

export const initCode = () => {
  const code = `
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";

(async () => {
  const web = await sp.web.select("Title")()
  console.log("Web Title: ", web.Title);
})().catch(console.log)
`
  return code.substring(code.indexOf('\n') + 1)
}

export const execme = (prepnp: string[], ecode: string[]) => {
  return `
var execme = function execme() {
  Promise.all([SystemJS.import(mod_common),SystemJS.import(mod_config),SystemJS.import(mod_graph),SystemJS.import(mod_logging),SystemJS.import(mod_odata),SystemJS.import(mod_pnpjs),SystemJS.import(mod_addin),SystemJS.import(mod_client),SystemJS.import(mod_sp),SystemJS.import(mod_taxonomy),SystemJS.import(mod_adaljs)]).then(function (modules) {
    ${prepnp.join('\n')}
    // Your code starts here
    // #####################
    ${ecode.map(e => '\t\t\t' + e).join('\n')}
    // #####################
    // Your code ends here
  });
};`
}

export const fixImports = (lines: string[], ecode: string[]) => {
  const prepnp: string[] = []
  lines.forEach(line => {
    // remove imports
    if (line.toLowerCase().indexOf('require(') === -1 && line.toLowerCase().indexOf('use strict') === -1 && line.toLowerCase().indexOf('__esmodule') === -1) {
      ecode.push(line)
    }
    if (line.toLowerCase().indexOf(' = require') > -1) {
      // fix imports
      const lineRe = line.match('var (.*) = require')
      let mod = -1
      mod = line.indexOf('@pnp/common') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/config-store') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/graph') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/logging') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/odata') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/pnpjs') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/sp-addinhelpers') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/sp-clientsvc') > -1 ? 7 : mod
      mod = line.indexOf('@pnp/sp') > -1 ? 5 : mod
      mod = line.indexOf('@pnp/sp-taxonomy') > -1 ? 9 : mod
      mod = line.indexOf('@pnp/adaljsclient') > -1 ? 10 : mod
      prepnp.push(`var ${lineRe![1]} = modules[${mod}];`)
    }
  })
  return prepnp
}

export const mod_common = `var mod_common = '${chrome.extension.getURL('bundles/common.es5.umd.bundle.js')}';`
export const mod_config = `var mod_config = '${chrome.extension.getURL('bundles/config-store.es5.umd.bundle.js')}';`
export const mod_graph = `var mod_graph = '${chrome.extension.getURL('bundles/graph.es5.umd.bundle.js')}';`
export const mod_logging = `var mod_logging = '${chrome.extension.getURL('bundles/logging.es5.umd.bundle.js')}';`
export const mod_odata = `var mod_odata = '${chrome.extension.getURL('bundles/odata.es5.umd.bundle.js')}';`
export const mod_pnpjs = `var mod_pnpjs = '${chrome.extension.getURL('bundles/pnpjs.es5.umd.bundle.js')}';`
export const mod_addin = `var mod_addin = '${chrome.extension.getURL('bundles/sp-addinhelpers.es5.umd.bundle.js')}';`
export const mod_client = `var mod_client = '${chrome.extension.getURL('bundles/sp-clientsvc.es5.umd.bundle.js')}';`
export const mod_taxonomy = `var mod_taxonomy = '${chrome.extension.getURL('bundles/sp-taxonomy.es5.umd.bundle.js')}';`
export const mod_sp = `var mod_sp = '${chrome.extension.getURL('bundles/sp.es5.umd.bundle.js')}';`
export const mod_adaljs = `var mod_adaljs = '${chrome.extension.getURL('bundles/adaljsclient.es5.umd.bundle.js')}';`
export const sj = `var sj = '${chrome.extension.getURL('bundles/system.js')}';`
