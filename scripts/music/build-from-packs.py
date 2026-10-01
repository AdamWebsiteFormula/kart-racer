"""Encode the game's music from the two bought packs (private rascal-sfx-source clone; raw files never enter this repo).
Usage: pip install numpy lameenc; python3 scripts/music/build-from-packs.py [packs dir] -> writes MP3s (128 kbps) to public/audio/music.
The song list, bpm and loops are PACK_SONGS in scripts/elevenlabs/catalog.ts."""
import wave,sys,os,json,numpy as np,lameenc
P=(sys.argv[1] if len(sys.argv)>1 else '/home/user/rascal-sfx-source/packs').rstrip('/')+'/'
J=P+'Kart_Racer__by_juanjo_sound_/'; F=P+'RacingMusicPack/'
jobs={'race-harbour':J+'2 LOOP Festival Day (by juanjo_sound).wav','race-meadow':F+'Hot Rod Hot.wav','race-mesa':J+'6 LOOP Canyon Dash (by juanjo_sound).wav',
'race-frost':F+'Infinity.wav','race-boardwalk':J+'7 LOOP Festival Night (by juanjo_sound).wav','race-finale':J+"1 LOOP Champion's Race (by juanjo_sound).wav",
'title':F+'Menu .wav','results':J+'8 LOOP Event Finished (by juanjo_sound).wav'}
guess={'race-harbour':161,'race-meadow':144,'race-mesa':136,'race-frost':136,'race-boardwalk':129,'race-finale':152,'title':117,'results':103}
out='public/audio/music/'; os.makedirs(out,exist_ok=True); res={}
for k,f in jobs.items():
    w=wave.open(f); n=w.getnframes(); r=w.getframerate(); sw=w.getsampwidth(); ch=w.getnchannels()
    raw=w.readframes(n)
    if sw==2: x=np.frombuffer(raw,np.int16).reshape(-1,ch)
    else:
        b=np.frombuffer(raw,np.uint8).reshape(-1,ch,sw); x=((b[:,:,sw-1].astype(np.int32)<<8)|b[:,:,sw-2]).astype(np.int16) if sw>=3 else None
    if ch==1: x=np.repeat(x,2,1)
    e=lameenc.Encoder(); e.set_bit_rate(128); e.set_in_sample_rate(r); e.set_channels(2); e.set_quality(2)
    data=e.encode(x.astype(np.int16).tobytes())+e.flush()
    open(out+k+'.mp3','wb').write(data)
    dur=n/r; best=None
    for bpm in range(100,181):
        beats=dur*bpm/60
        for bars in (4,8,12,16,20,24,32,36,40,48):
            err=abs(beats-bars*4)/(bars*4)
            if best is None or (abs(bpm-guess[k])<=6 and err<best[0]): best=(err,bpm,bars)
    res[k]=dict(dur=round(dur,3),bytes=len(data),bpmBest=best[1],bars=best[2],err=round(best[0],4))
    print(k,res[k])
