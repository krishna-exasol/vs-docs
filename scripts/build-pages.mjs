import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const repository='krishna-exasol/vs-docs';
const marker=/<script id="page-build-info" type="application\/json">[\s\S]*?<\/script>/g;

export function stampPage(html,info){
  if([...html.matchAll(marker)].length!==1)throw new Error('Expected exactly one page-build-info block');
  if(info.repository!==repository||info.schema!==1)throw new Error('Unexpected build metadata');
  if(info.state==='published'&&(!/^[0-9a-f]{40}$/.test(info.commit||'')||!Number.isFinite(Date.parse(info.updatedAt))||!Number.isFinite(Date.parse(info.builtAt))))throw new Error('Published builds require a full commit ID and valid timestamps');
  if(!['published','local-preview'].includes(info.state))throw new Error('Unknown build state');
  const json=JSON.stringify(info).replaceAll('<','\\u003c');
  return html.replace(marker,()=>'<script id="page-build-info" type="application/json">'+json+'</script>');
}

async function main(){
  const args=process.argv.slice(2);
  if(args.some(arg=>arg!=='--preview'))throw new Error('Usage: node scripts/build-pages.mjs [--preview]');
  const preview=args.includes('--preview');
  const root=fileURLToPath(new URL('../',import.meta.url));
  const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
  const commit=git('rev-parse','HEAD');
  const dirty=git('status','--porcelain','--untracked-files=all','--','vs-slides.html','index.html','scripts/build-pages.mjs','.github/workflows/pages.yml');
  if(!preview&&dirty)throw new Error('Refusing to label uncommitted files as a published commit. Commit first, or use --preview.');
  if(!preview&&process.env.GITHUB_SHA&&process.env.GITHUB_SHA!==commit)throw new Error('Checkout does not match the workflow commit');
  const html=await fs.readFile(path.join(root,'vs-slides.html'),'utf8');
  const sourceMetadata=JSON.parse(html.match(/<script id="page-build-info" type="application\/json">([\s\S]*?)<\/script>/)?.[1]||'{}');
  const info={schema:1,repository,commit:preview?null:commit,basedOn:commit,updatedAt:preview?sourceMetadata.updatedAt:git('show','-s','--format=%cI',commit),builtAt:new Date().toISOString(),state:preview?'local-preview':'published'};
  const stamped=stampPage(html,info);
  const output=path.join(root,'_site');
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,'vs-slides.html'),stamped);
  await fs.writeFile(path.join(output,'version.json'),JSON.stringify(info,null,2)+'\n');
  for(const file of ['index.html','.nojekyll','LICENSE'])await fs.copyFile(path.join(root,file),path.join(output,file));
  console.log((preview?'Local preview':'Published build')+' prepared in _site; source HTML unchanged.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
