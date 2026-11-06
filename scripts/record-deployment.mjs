import fs from 'node:fs';
import { JsonRpcProvider, Contract, getAddress, keccak256 } from 'ethers';
const path=process.argv[2];if(!path)throw Error('Usage: npm run record-deployment -- path/to/sepolia-deployment.json');
const record=JSON.parse(fs.readFileSync(path,'utf8'));
if(record.chainId!==11155111||record.network!=='sepolia')throw Error('Expected a Sepolia deployment record.');
const address=getAddress(record.address);
const provider=new JsonRpcProvider(process.env.SEPOLIA_RPC_URL||'https://ethereum-sepolia-rpc.publicnode.com');
try{
 if((await provider.getNetwork()).chainId!==11155111n)throw Error('RPC endpoint is not Sepolia.');
 const receipt=await provider.getTransactionReceipt(record.transactionHash);
 if(!receipt||receipt.status!==1||!receipt.contractAddress||getAddress(receipt.contractAddress)!==address)throw Error('Deployment receipt does not confirm this contract.');
 const artifact=JSON.parse(fs.readFileSync('src/contract.json'));
 const tx=await provider.getTransaction(record.transactionHash);
 if(!tx||tx.to!==null||keccak256(tx.data)!==keccak256(artifact.bytecode))throw Error('Deployment bytecode does not match this project.');
 if(await provider.getCode(address)==='0x')throw Error('Contract code missing.');
 await new Contract(address,artifact.abi,provider).getNote();
 const verified={network:'sepolia',chainId:11155111,address,transactionHash:receipt.hash,blockNumber:receipt.blockNumber};
 fs.writeFileSync('src/deployment.json',JSON.stringify(verified,null,2)+'\n');
 let readme=fs.readFileSync('README.md','utf8');
 readme=readme.replace(/<!-- deployment:start -->[\s\S]*?<!-- deployment:end -->/,`<!-- deployment:start -->\n- Test network: **Ethereum Sepolia**\n- Chain ID: **11155111**\n- Contract address: [\`${address}\`](https://sepolia.etherscan.io/address/${address})\n- Deployment transaction: [\`${receipt.hash}\`](https://sepolia.etherscan.io/tx/${receipt.hash})\n<!-- deployment:end -->`);
 readme=readme.replace('This section is deliberately not populated with an invented address. Run the deployment steps below and record the confirmed deployment before submitting the assignment.','The deployment above was verified against its successful Sepolia receipt and this project’s compiled creation bytecode.');
 fs.writeFileSync('README.md',readme);console.log('Verified and recorded Sepolia contract:',address);
}finally{provider.destroy();}
