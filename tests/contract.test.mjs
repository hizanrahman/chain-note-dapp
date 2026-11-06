import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory } from 'ethers';
const artifact=JSON.parse(fs.readFileSync('src/contract.json'));
test('ChainNote deploys, updates from multiple wallets, emits events and enforces byte limits', async()=>{
 const chain=ganache.provider({logging:{quiet:true}});
 try {
 const provider=new BrowserProvider(chain);const first=await provider.getSigner(0), second=await provider.getSigner(1);
 const contract=await new ContractFactory(artifact.abi,artifact.bytecode,first).deploy();await contract.waitForDeployment();
 let note=await contract.getNote();assert.equal(note[0],'Hello, decentralized world!');assert.equal(note[1],await first.getAddress());assert.equal(note[3],0n);
 const receipt=await(await contract.connect(second).setMessage('Hello from another wallet',{gasLimit:500000})).wait();
 note=await contract.getNote();assert.equal(note[0],'Hello from another wallet');assert.equal(note[1],await second.getAddress());assert.equal(note[3],1n);assert.ok(note[2]>0n);
 const event=contract.interface.parseLog(receipt.logs[0]);assert.equal(event.name,'MessageUpdated');assert.equal(event.args.revision,1n);
 await assert.rejects(contract.setMessage(''));await assert.rejects(contract.setMessage('x'.repeat(281)));await assert.rejects(contract.setMessage('🙂'.repeat(71)));
 await(await contract.setMessage('x'.repeat(280),{gasLimit:500000})).wait();assert.equal((await contract.getNote())[0].length,280);
 await(await contract.setMessage('🙂'.repeat(70),{gasLimit:500000})).wait();assert.equal((await contract.getNote())[3],3n);
 }finally{await chain.disconnect();}
});
