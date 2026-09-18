// Small bridge for the Android Capacitor build. In a browser, app.js uses Web Speech API.
// In the native shell, the Capacitor speech-recognition plugin is exposed when available.
(() => {
  const cap = window.Capacitor;
  const plugin = cap?.Plugins?.SpeechRecognition;
  if (!plugin || window.SpeechRecognition) return;
  window.SpeechRecognition = class NativeSpeechRecognition {
    constructor(){this.lang='en-IN';this.interimResults=false;this.continuous=false;this.maxAlternatives=1;this.onresult=null;this.onerror=null;this.onend=null;}
    async start(){
      try{
        await plugin.requestPermissions?.();
        const result=await plugin.start({language:this.lang,maxResults:this.maxAlternatives||1,partialResults:false,popup:false});
        const text=result?.matches?.[0]||'';
        if(text&&this.onresult)this.onresult({resultIndex:0,results:[[{transcript:text}]]});
      }catch(error){if(this.onerror)this.onerror({error:'native-error',message:String(error?.message||error)})}
      finally{if(this.onend)this.onend()}
    }
    async stop(){try{await plugin.stop?.()}catch(_){} if(this.onend)this.onend()}
  };
})();
