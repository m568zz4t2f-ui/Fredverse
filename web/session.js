/* Browser saves + manual WebRTC signaling. No relay, discovery server or external requests. */
(() => {
  'use strict';
  const {World,id,validateSave}=FredCore, SAVE_KEY='fredverse.browser.v2', GUEST_KEY='fredverse.guests.v2';
  function codeEncode(data){const bytes=new TextEncoder().encode(JSON.stringify(data));return 'FREDVERSE2.'+btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));}
  function codeDecode(value,type){
    if(typeof value!=='string'||value.length>150000||!value.trim().startsWith('FREDVERSE2.'))throw Error('Paste a complete Fred Verse connection code.');
    let data;try{data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.trim().slice(11)),c=>c.charCodeAt(0))));}catch{throw Error('The connection code is damaged or incomplete.');}
    if(data?.v!==2||data.type!==type||typeof data.id!=='string'||!/^[a-f0-9]{48}$/.test(data.id)||typeof data.worldId!=='string'||!/^[a-f0-9]{48}$/.test(data.worldId)||data.sdp?.type!==type||typeof data.sdp.sdp!=='string'||data.sdp.sdp.length>100000)throw Error('This is not a compatible '+type+' code.');
    return data;
  }
  async function gather(pc){
    const checkCandidates=()=>{if(!/a=candidate:/.test(pc.localDescription?.sdp||''))throw Error('No direct connection candidates are available. This browser or network may disable peer networking. Try a normal browser on the same LAN; solo still works.');};
    if(pc.iceGatheringState==='complete'){checkCandidates();return;}
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(Error('Local connection gathering timed out. Try again or use a supported browser on HTTPS.'));},8000);
      const check=()=>{if(pc.iceGatheringState==='complete'){cleanup();resolve();}};
      const cleanup=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);};
      pc.addEventListener('icegatheringstatechange',check);check();
    });
    checkCandidates();
  }
  class Session{
    constructor(){
      this.world=null;this.localToken='';this.role='solo';this.peers=new Map();this.pending=new Map();this.saved=null;this.storageOK=true;this.saveError='';this.hasStoredData=false;
      this.onstate=()=>{};this.onstatus=()=>{};this.peerState=null;this.paused=()=>false;this.guestKeys={};this.hostWorldId='';this.lastSaved=0;this.lastBroadcast=0;this.status='OFFLINE SOLO';
      try{const raw=localStorage.getItem(SAVE_KEY);this.hasStoredData=!!raw;if(raw)this.saved=validateSave(JSON.parse(raw));const guests=JSON.parse(localStorage.getItem(GUEST_KEY)||'{}');if(guests&&typeof guests==='object'&&!Array.isArray(guests))this.guestKeys=guests;}
      catch(error){this.saveError='Saved data could not be read: '+error.message+' You can import a backup or start a new game.';}
      try{localStorage.setItem('fredverse.check','1');localStorage.removeItem('fredverse.check');}catch{this.storageOK=false;this.saveError='Browser storage is unavailable. Use Export Save before closing.';}
      this.previous=performance.now();this.timer=setInterval(()=>this.tick(),1000/30);
    }
    setStatus(text){this.status=text;this.onstatus(text);}
    newGame(name,variant){this.disconnectAll();this.world=new World();this.localToken=this.world.join('',name,variant);this.role='solo';this.peerState=null;this.setStatus('OFFLINE SOLO');this.persist();return this.localToken;}
    continueGame(){if(!this.saved)throw Error('No browser save found. Import a backup or start a new game.');const loaded=World.load(this.saved);
      this.disconnectAll();this.world=loaded.world;this.localToken=loaded.localToken;const p=this.world.players.get(this.localToken);this.world.join(this.localToken,p.name,p.variant);this.role='solo';this.peerState=null;this.setStatus('OFFLINE SOLO');return this.localToken;}
    snapshot(){if(this.role==='guest'){if(!this.peerState)throw Error('Waiting for the host snapshot.');return this.peerState;}if(!this.world||!this.localToken)throw Error('Start a game first.');const s=this.world.snapshot(this.localToken);s.save_error=this.saveError||null;return s;}
    input(data){if(this.role==='guest'){
        const peer=this.peers.get('host');if(!peer?.ready||peer.channel.readyState!=='open')throw Error('Disconnected from host. Exchange fresh connection codes to rejoin.');this.send(peer,{type:'input',data});
      }else if(this.world){const p=this.world.players.get(this.localToken);if(p&&!p.online)this.world.join(this.localToken,p.name,p.variant);this.world.input(this.localToken,data);if(this.world.dirty)this.persist();}}
    tick(){const now=performance.now(),dt=Math.min(.1,(now-this.previous)/1000);this.previous=now;
      if(this.role!=='guest'&&this.world){
        const online=[...this.world.players.values()].filter(p=>p.online).length;
        if(!(this.role==='solo'&&online<=1&&this.paused())){this.world.tick(Math.max(.001,dt));}
        if(now-this.lastSaved>5000)this.persist();
        if(now-this.lastBroadcast>70){this.lastBroadcast=now;for(const peer of this.peers.values())if(peer.ready&&peer.token){try{this.send(peer,{type:'state',state:this.world.snapshot(peer.token)});}catch(error){this.drop(peer,error.message);}}}
      }
      for(const [key,pending] of this.pending)if(now-pending.created>120000){pending.pc.close();this.pending.delete(key);}
      for(const peer of this.peers.values())if(peer.deadline&&!peer.ready&&now>peer.deadline)this.drop(peer,'Connection timed out. Check the local network and exchange fresh codes.');
    }
    persist(){if(this.role==='guest'||!this.world||!this.localToken)return;
      this.saved=this.world.serialize(this.localToken);this.hasStoredData=true;this.lastSaved=performance.now();this.world.dirty=false;
      if(!this.storageOK)return;
      try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.saved));this.saveError='';}catch{this.storageOK=false;this.saveError='Save failed: browser storage unavailable/full. Export Save to keep your progress.';}
    }
    exportSave(){if(this.role==='guest')throw Error('The host owns this shared world. Ask the host to export its save. Your rejoin key stays in this browser.');this.persist();if(!this.saved)throw Error('Start a game or import a save first.');return JSON.stringify(this.saved,null,2);}
    importSave(text){if(typeof text!=='string'||text.length>1024*1024)throw Error('Save must be a JSON file under 1 MB.');let data;try{data=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Current progress was not changed.');}
      const loaded=World.load(data); // Validate everything before disconnecting or replacing progress.
      this.disconnectAll();this.role='solo';this.world=loaded.world;this.localToken=loaded.localToken;const p=this.world.players.get(this.localToken);this.world.join(this.localToken,p.name,p.variant);this.peerState=null;this.setStatus('OFFLINE SOLO');this.persist();return this.localToken;
    }
    rtc(){if(typeof RTCPeerConnection!=='function')throw Error('This browser cannot make WebRTC connections. Solo still works. Try current Chrome/Edge/Firefox on the HTTPS-hosted game.');return new RTCPeerConnection({iceServers:[]});}
    send(peer,data){if(peer.channel.readyState!=='open')return;if(peer.channel.bufferedAmount>128000)return;peer.channel.send(JSON.stringify(data));}
    wire(pc,channel,key,role,info={}){
      const peer={pc,channel,key,role,ready:false,token:'',seq:-1,...info};this.peers.set(key,peer);
      channel.onopen=()=>{if(role==='guest')this.send(peer,{type:'hello',name:peer.name,variant:peer.variant,token:this.guestKeys[peer.worldId]||''});};
      channel.onmessage=event=>{
        try{
          if(typeof event.data!=='string'||event.data.length>64000)throw Error('Oversized or unsupported network message.');const msg=JSON.parse(event.data);
          if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('Invalid network message.');
          if(role==='host'){
            if(msg.type==='hello'&&!peer.ready){
              const requested=typeof msg.token==='string'?msg.token:'';
              if(requested===this.localToken||[...this.peers.values()].some(p=>p!==peer&&p.ready&&p.token===requested))throw Error('This Fred is already controlled by another connection.');
              peer.token=this.world.join(requested,msg.name,msg.variant);peer.ready=true;
              this.send(peer,{type:'welcome',token:peer.token,worldId:this.world.worldId});this.send(peer,{type:'state',state:this.world.snapshot(peer.token)});this.persist();this.setStatus('LAN HOST · '+[...this.peers.values()].filter(p=>p.ready).length+' GUEST(S)');
            }else if(msg.type==='input'&&peer.ready){
              if(!Number.isInteger(msg.seq)||msg.seq<=peer.seq)return;
              const now=performance.now();if(now-(peer.rateStart||0)>1000){peer.rateStart=now;peer.rate=0;}if((peer.rate=(peer.rate||0)+1)>60)throw Error('Too many input messages.');
              this.world.input(peer.token,msg.data);peer.seq=msg.seq;if(this.world.dirty)this.persist();
            }else throw Error('Unexpected guest message.');
          }else{
            if(msg.type==='welcome'&&typeof msg.token==='string'&&/^[a-f0-9]{48}$/.test(msg.token)&&msg.worldId===peer.worldId){
              peer.ready=true;this.localToken=msg.token;this.guestKeys[msg.worldId]=msg.token;
              for(const [key,pending] of this.pending)if(pending.pc===pc)this.pending.delete(key);
              try{localStorage.setItem(GUEST_KEY,JSON.stringify(this.guestKeys));}catch{this.storageOK=false;}
              this.setStatus('LAN GUEST · CONNECTED');
            }else if(msg.type==='state'&&peer.ready){
              if(!msg.state?.self||!Array.isArray(msg.state.players)||msg.state.players.length>4||!Object.hasOwn(FredCore.ZONES,msg.state.self.zone))throw Error('Invalid host snapshot.');
              this.peerState=msg.state;this.onstate(this.peerState);
            }else if(msg.type==='error')throw Error(String(msg.error).slice(0,200));
            else throw Error('Unexpected host message.');
          }
        }catch(error){if(role==='host')this.send(peer,{type:'error',error:error.message});this.drop(peer,error.message);}
      };
      channel.onclose=()=>this.drop(peer,'Connection closed. Generate a new invite/reply to rejoin.');
      channel.onerror=()=>this.drop(peer,'Data channel failed. Try HTTPS and the same local network.');
      pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))this.drop(peer,'Connection '+pc.connectionState+'. Exchange fresh codes to rejoin.');};
      return peer;
    }
    drop(peer,reason){if(this.peers.get(peer.key)!==peer)return;this.peers.delete(peer.key);peer.channel.onclose=null;peer.pc.onconnectionstatechange=null;peer.pc.close();
      for(const [key,pending] of this.pending)if(pending.pc===peer.pc)this.pending.delete(key);
      if(peer.role==='host'){this.world?.disconnect(peer.token);this.persist();this.setStatus('LAN HOST · '+reason);}
      else{this.peerState=null;this.setStatus('DISCONNECTED · '+reason);}
    }
    async invite(){if(!this.world||this.role==='guest')throw Error('Start or continue a solo game before hosting.');
      if([...this.world.players.values()].filter(p=>p.online).length+this.pending.size>=4)throw Error('Four-player capacity reached. Cancel unused invites first.');
      this.role='host';const pc=this.rtc(),key=id(),channel=pc.createDataChannel('fred-verse-v2',{ordered:true}),peer=this.wire(pc,channel,key,'host');
      this.pending.set(key,{pc,peer,created:performance.now()});
      try{await pc.setLocalDescription(await pc.createOffer());await gather(pc);this.setStatus('LAN HOST · INVITE READY');return codeEncode({v:2,type:'offer',id:key,worldId:this.world.worldId,sdp:pc.localDescription.toJSON()});}
      catch(error){this.pending.delete(key);this.drop(peer,error.message);if(!this.peers.size)this.role='solo';throw error;}
    }
    async answer(invite,name,variant){const data=codeDecode(invite,'offer');
      if(typeof name!=='string'||!name.trim()||name.length>24||!['Dorm Fred','MLB Fred'].includes(variant))throw Error('Enter your name and select a Fred variant.');
      const pc=this.rtc();this.persist();this.disconnectAll();this.role='guest';this.hostWorldId=data.worldId;this.peerState=null;
      pc.ondatachannel=e=>this.wire(pc,e.channel,'host','guest',{name:name.trim(),variant,worldId:data.worldId});
      // Track the pending connection before a data channel arrives, so cancellation closes it.
      this.pending.set(data.id,{pc,created:performance.now()});
      try{await pc.setRemoteDescription(data.sdp);await pc.setLocalDescription(await pc.createAnswer());await gather(pc);this.setStatus('LAN GUEST · SEND REPLY TO HOST');return codeEncode({v:2,type:'answer',id:data.id,worldId:data.worldId,sdp:pc.localDescription.toJSON()});}
      catch(error){pc.close();this.pending.delete(data.id);this.role='solo';throw error;}
    }
    async accept(answer){const data=codeDecode(answer,'answer'),pending=this.pending.get(data.id);
      if(this.role!=='host'||data.worldId!==this.world?.worldId||!pending)throw Error('This reply does not match an active invite. Generate a fresh invite for each guest.');
      await pending.pc.setRemoteDescription(data.sdp);pending.peer.deadline=performance.now()+20000;this.pending.delete(data.id);this.setStatus('LAN HOST · CONNECTING');
    }
    disconnectAll(){for(const peer of [...this.peers.values()])this.drop(peer,'Session ended.');for(const p of this.pending.values())p.pc.close();this.pending.clear();}
    leave(){if(this.role==='guest'){this.disconnectAll();this.role='solo';this.peerState=null;
        if(this.world&&this.saved){const loaded=World.load(this.saved);this.world=loaded.world;this.localToken=loaded.localToken;const p=this.world.players.get(this.localToken);this.world.join(this.localToken,p.name,p.variant);}else{this.world=null;this.localToken='';}
      }else{this.disconnectAll();this.role='solo';this.persist();}this.setStatus('OFFLINE SOLO');}
  }
  // Monotonic guest sequence numbers prevent replayed actions from duplicating rewards.
  const send=Session.prototype.send;Session.prototype.send=function(peer,data){if(data.type==='input')data={...data,seq:peer.sentSeq=(peer.sentSeq??0)+1};return send.call(this,peer,data);};
  globalThis.FredSession=Session;
})();
