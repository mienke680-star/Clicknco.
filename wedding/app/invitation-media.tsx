'use client';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play,Volume2,VolumeX} from 'lucide-react';

export function BackgroundMusic({src}:{src:string}){
  const audio=useRef<HTMLAudioElement>(null);
  const pausedByGuest=useRef(false);
  const [playing,setPlaying]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const player=audio.current;
    if(!player)return;
    pausedByGuest.current=false;
    setFailed(false);
    const start=()=>{if(!pausedByGuest.current&&player.paused)void player.play().catch(()=>{});};
    const firstInteraction=(event:Event)=>{
      if(event.target instanceof Element&&event.target.closest('[data-music-toggle]'))return;
      start();
    };
    start();
    // Sound needs a user gesture on some phones; start on their first tap or key.
    document.addEventListener('pointerdown',firstInteraction);
    document.addEventListener('keydown',firstInteraction);
    return ()=>{
      document.removeEventListener('pointerdown',firstInteraction);
      document.removeEventListener('keydown',firstInteraction);
      player.pause();
    };
  },[src]);
  function toggle(){
    const player=audio.current;if(!player)return;
    if(!player.paused){pausedByGuest.current=true;player.pause();}
    else{pausedByGuest.current=false;setFailed(false);void player.play().catch(e=>{if(e.name!=='NotAllowedError')setFailed(true);});}
  }
  return <>
    <audio ref={audio} src={src} autoPlay loop preload="auto" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)}/>
    <div className="invite-music-control">
      <button type="button" data-music-toggle aria-label={playing?'Pause invitation music':'Play invitation music'} aria-pressed={playing} onClick={toggle}>
        {playing?<Volume2 size={18}/>:<VolumeX size={18}/>}<span>{playing?'Music on':'Play music'}</span>
      </button>
      {failed&&<small role="status">Music couldn’t load. Please refresh and try again.</small>}
    </div>
  </>;
}

export function LoopingVideo({src}:{src:string}){
  const video=useRef<HTMLVideoElement>(null);
  const [playing,setPlaying]=useState(false);
  function toggle(){const player=video.current;if(!player)return;if(player.paused)void player.play().catch(()=>{});else player.pause();}
  return <div className="invite-video-wrap">
    <video ref={video} className="invite-video" src={src} autoPlay loop muted playsInline preload="auto" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
    <button type="button" className="invite-video-toggle" onClick={toggle} aria-label={playing?'Pause invitation video':'Play invitation video'}>{playing?<Pause size={18}/>:<Play size={18}/>}</button>
  </div>;
}
