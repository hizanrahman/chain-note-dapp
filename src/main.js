import './style.css';
import { BrowserProvider, Contract, ContractFactory, JsonRpcProvider, getAddress, isAddress } from 'ethers';
import artifact from './contract.json';
import deployment from './deployment.json';
const $=id=>document.getElementById(id);
const SEPOLIA='0xaa36a7';
const readProvider=new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
let provider, signer, contract, busy=false, record;
const short=a=>a.slice(0,6)+'…'+a.slice(-4);
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function controls(){for(const id of ['connect','load','deploy','refresh']) $(id).disabled=busy;const n=new TextEncoder().encode($('draft').value.trim()).length;$('count').textContent=`${n} / 280 bytes`;$('publish').disabled=busy||!contract||!signer||n===0||n>280;}
async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){status(e.code===4001||e.code==='ACTION_REJECTED'?'Request declined in your wallet. You can try again.':e.shortMessage||e.reason||e.message||'Something went wrong.',true);}finally{busy=false;controls();}}
function transaction(hash){$('transaction').href=`https://sepolia.etherscan.io/tx/${hash}`;$('transaction').hidden=false;}
async function wallet(){
 if(!window.ethereum)throw Error('No wallet detected. Open this page in a browser with MetaMask installed.');
 await window.ethereum.request({method:'eth_requestAccounts'});
 const chain=await window.ethereum.request({method:'eth_chainId'});
 if(chain!==SEPOLIA){try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:SEPOLIA}]});}catch(e){if(e.code!==4902)throw e;await window.ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:SEPOLIA,chainName:'Sepolia',nativeCurrency:{name:'Sepolia ETH',symbol:'ETH',decimals:18},rpcUrls:['https://ethereum-sepolia-rpc.publicnode.com'],blockExplorerUrls:['https://sepolia.etherscan.io']}]});}}
 provider=new BrowserProvider(window.ethereum);
 if((await provider.getNetwork()).chainId!==11155111n)throw Error('Switch your wallet to Sepolia and connect again.');
 signer=await provider.getSigner();$('connect').textContent=short(await signer.getAddress());
}
async function correctNetwork(){if(await window.ethereum.request({method:'eth_chainId'})!==SEPOLIA)throw Error('Please switch to Sepolia before continuing.');}
function render(note){$('message').textContent=note[0];$('writer').textContent=short(note[1]);$('writer').title=note[1];$('revision').textContent=note[3].toString();$('updated').textContent=new Date(Number(note[2])*1000).toLocaleString();$('note-state').textContent='Read from Sepolia';}
async function load(){
 contract=null;controls();
 if(!signer)await wallet();await correctNetwork();
 const address=$('address').value.trim();if(!isAddress(address))throw Error('Enter a valid Sepolia contract address.');
 const normalized=getAddress(address);if(await readProvider.getCode(normalized)==='0x')throw Error('No contract exists at this address on Sepolia.');
 const reader=new Contract(normalized,artifact.abi,readProvider);const note=await reader.getNote();
 contract=new Contract(normalized,artifact.abi,signer);render(note);$('address').value=normalized;
 localStorage.setItem('chain-note:sepolia:address',normalized);$('contract-info').textContent=`Sepolia · ${normalized}`;
 status('Contract loaded. You can now publish a note.');
}
$('connect').onclick=()=>run(async()=>{await wallet();status('Wallet connected to Sepolia. Deploy or load a contract to continue.');if($('address').value.trim())await load();});
$('load').onclick=()=>run(load);
$('refresh').onclick=()=>run(async()=>{if(!contract)throw Error('Connect and load a contract first.');await correctNetwork();const reader=new Contract(await contract.getAddress(),artifact.abi,readProvider);render(await reader.getNote());status('Latest note loaded from Sepolia.');});
$('deploy').onclick=()=>run(async()=>{
 if(!signer)await wallet();await correctNetwork();status('Approve the ChainNote deployment in your wallet.');
 const deployed=await new ContractFactory(artifact.abi,artifact.bytecode,signer).deploy();
 const tx=deployed.deploymentTransaction();transaction(tx.hash);status('Deployment submitted. Waiting for a confirmation…');
 await deployed.waitForDeployment();const receipt=await tx.wait();
 record={network:'sepolia',chainId:11155111,address:await deployed.getAddress(),transactionHash:receipt.hash,blockNumber:receipt.blockNumber};
 $('address').value=record.address;localStorage.setItem('chain-note:deployment',JSON.stringify(record));$('download').hidden=false;
 await load();status('Contract deployed and confirmed on Sepolia. Publish your first note, then download the deployment record.');
});
$('note-form').onsubmit=e=>{e.preventDefault();run(async()=>{
 await correctNetwork();if(!contract)throw Error('Load a contract first.');const text=$('draft').value.trim();const length=new TextEncoder().encode(text).length;if(!length||length>280)throw Error('Use 1–280 UTF-8 bytes.');
 status('Approve your message in your wallet.');const gas=await contract.setMessage.estimateGas(text);const tx=await contract.setMessage(text,{gasLimit:gas*120n/100n});transaction(tx.hash);status('Message submitted. Waiting for a confirmation…');await tx.wait();const reader=new Contract(await contract.getAddress(),artifact.abi,readProvider);render(await reader.getNote());$('draft').value='';status('Your note is confirmed on Sepolia.');
 });};
$('draft').oninput=controls;
$('download').onclick=()=>{if(!record)return;const blob=new Blob([JSON.stringify(record,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='sepolia-deployment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
try{$('address').value=deployment.address||localStorage.getItem('chain-note:sepolia:address')||'';record=JSON.parse(localStorage.getItem('chain-note:deployment')||'null');$('download').hidden=!record;}catch{}
function reset(){provider=signer=contract=null;$('connect').textContent='Connect wallet ↗';$('message').textContent='Reconnect to read the note.';$('note-state').textContent='Wallet changed';for(const id of ['writer','revision','updated'])$(id).textContent='—';status('Wallet or network changed. Connect again to refresh the note.');controls();}
window.ethereum?.on('accountsChanged',reset);window.ethereum?.on('chainChanged',reset);
controls();
