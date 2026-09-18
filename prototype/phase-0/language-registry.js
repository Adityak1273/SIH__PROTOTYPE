/* Cognitive Care NER — Northeast language registry.
 * Discovery/implementation status is based on the 2025 WMT low-resource Indic task
 * plus AI4Bharat/IndicTrans2 resources. "Implemented" means the current app exposes
 * the language in the UI and has a local UI translation pack; it does not claim that
 * a fine-tuned model is bundled in this static prototype.
 */
(() => {
  'use strict';
  const languages = [
    {id:'en-IN',name:'English',native:'English',aliases:['English','EN'],state:'All',status:'implemented',data:'Baseline',pairs:'—'},
    {id:'njz-IN',name:'Nyishi',native:'Nyishi',aliases:['Nishi','Nissi','Nyshi','Nyishi'],state:'Arunachal Pradesh',status:'implemented',data:'Moderate',pairs:'60,000'},
    {id:'adi-IN',name:'Adi',native:'Adi',aliases:['Adi'],state:'Arunachal Pradesh',status:'not-implemented',data:'No verified sufficient EN↔local corpus',pairs:'—'},
    {id:'glo-IN',name:'Galo',native:'Galo',aliases:['Galo'],state:'Arunachal Pradesh',status:'not-implemented',data:'No verified sufficient EN↔local corpus',pairs:'—'},
    {id:'msh-IN',name:'Mishmi',native:'Mishmi',aliases:['Idu Mishmi','Mishmi'],state:'Arunachal Pradesh',status:'not-implemented',data:'Documentation/speech resources',pairs:'—'},
    {id:'as-IN',name:'Assamese',native:'অসমীয়া',aliases:['Assamese','অসমীয়া','Asamiya'],state:'Assam',status:'implemented',data:'Moderate',pairs:'54,000'},
    {id:'brx-IN',name:'Bodo',native:'बड़ो',aliases:['Bodo','Boro','बड़ो'],state:'Assam',status:'not-implemented',data:'Very limited',pairs:'15,215'},
    {id:'bn-IN',name:'Bengali',native:'বাংলা',aliases:['Bengali','Bangla','বাংলা'],state:'Assam / Tripura',status:'implemented',data:'High-resource',pairs:'8M+'},
    {id:'mni-IN',name:'Meitei (Manipuri)',native:'ꯃꯤꯇꯩꯂꯣꯟ',aliases:['Meitei','Manipuri','Meiteilon','ꯃꯤꯇꯩꯂꯣꯟ'],state:'Manipur',status:'implemented',data:'Moderate',pairs:'23,687'},
    {id:'kha-IN',name:'Khasi',native:'Khasi',aliases:['Khasi','Khasia'],state:'Meghalaya',status:'implemented',data:'Moderate',pairs:'26,000'},
    {id:'gar-IN',name:'Garo',native:'A·chik',aliases:['Garo','A·chik','Achik'],state:'Meghalaya',status:'not-implemented',data:'Small public preview',pairs:'2,500 preview'},
    {id:'lus-IN',name:'Mizo',native:'Mizo',aliases:['Mizo','Lushai','Mizo ṭawng'],state:'Mizoram',status:'implemented',data:'Moderate',pairs:'50,000'},
    {id:'hi-IN',name:'Hindi',native:'हिन्दी',aliases:['Hindi','हिन्दी','हिंदी'],state:'Mizoram / Northeast',status:'implemented',data:'High-resource',pairs:'8M+'},
    {id:'nag-IN',name:'Nagamese',native:'Nagamese',aliases:['Nagamese','Naga Pidgin'],state:'Nagaland',status:'not-implemented',data:'Very limited',pairs:'3K–9K'},
    {id:'njo-IN',name:'Ao',native:'Ao',aliases:['Ao','Chungli Ao','Mongsen Ao'],state:'Nagaland',status:'not-implemented',data:'Lexical/text resources',pairs:'—'},
    {id:'nri-IN',name:'Angami',native:'Tenyidie',aliases:['Angami','Tenyidie'],state:'Nagaland',status:'not-implemented',data:'Annotated NLP resources',pairs:'—'},
    {id:'nsm-IN',name:'Sumi',native:'Sumi',aliases:['Sumi','Sümi','Sema'],state:'Nagaland',status:'not-implemented',data:'Documentation resources',pairs:'—'},
    {id:'ne-IN',name:'Nepali',native:'नेपाली',aliases:['Nepali','नेपाली'],state:'Sikkim',status:'not-implemented',data:'Strong EN↔Indic resources, but not selected from the Northeast MT set',pairs:'Large'},
    {id:'sik-IN',name:'Sikkimese (Bhutia)',native:'འབྲས་ལྗོངས་ཁ',aliases:['Sikkimese','Bhutia','Sikkimese Bhutia'],state:'Sikkim',status:'not-implemented',data:'Limited',pairs:'—'},
    {id:'gvr-IN',name:'Gurung',native:'तमु',aliases:['Gurung','Tamu'],state:'Sikkim',status:'not-implemented',data:'Lexical resources',pairs:'—'},
    {id:'lif-IN',name:'Limbu',native:'ᤕᤰᤌᤢ',aliases:['Limbu','Yakthung'],state:'Sikkim',status:'not-implemented',data:'Text/documentation',pairs:'—'},
    {id:'mrg-IN',name:'Magar',native:'मगर',aliases:['Magar','Magar Kham'],state:'Sikkim',status:'not-implemented',data:'Limited',pairs:'—'},
    {id:'mkh-IN',name:'Mukhia',native:'Mukhia',aliases:['Mukhia'],state:'Sikkim',status:'not-implemented',data:'Limited documentation',pairs:'—'},
    {id:'new-IN',name:'Newari',native:'नेपाल भाषा',aliases:['Newari','Nepal Bhasa','नेपाल भाषा'],state:'Sikkim',status:'not-implemented',data:'Monolingual resources',pairs:'—'},
    {id:'rai-IN',name:'Rai',native:'Rai',aliases:['Rai'],state:'Sikkim',status:'not-implemented',data:'Limited documentation',pairs:'—'},
    {id:'xsr-IN',name:'Sherpa',native:'ཤར་པ',aliases:['Sherpa'],state:'Sikkim',status:'not-implemented',data:'Limited documentation',pairs:'—'},
    {id:'taj-IN',name:'Tamang',native:'तामाङ',aliases:['Tamang','Tamangic'],state:'Sikkim',status:'not-implemented',data:'Nepali↔Tamang; not direct EN↔Tamang',pairs:'20K gold + synthetic'},
    {id:'lep-IN',name:'Lepcha',native:'ᰛᰩᰵᰛᰫ',aliases:['Lepcha','Róng'],state:'Sikkim',status:'not-implemented',data:'Limited documentation',pairs:'—'},
    {id:'trp-IN',name:'Kokborok',native:'Kokborok',aliases:['Kokborok','Tripuri','Kok Borok'],state:'Tripura',status:'not-implemented',data:'Very limited',pairs:'2,269'}
  ];
  const sufficient = languages.filter(x => x.status === 'implemented' && x.id !== 'en-IN');
  window.CCNER_LANGUAGE_REGISTRY = Object.freeze(languages);
  window.CCNER_LANGUAGE_POLICY = Object.freeze({
    sufficientRule:'Implemented where verified direct English↔local parallel data is at least ~20K sentence pairs, or the language is a high-resource Indic baseline already supported by the project.',
    sufficientLanguages:['Assamese','Bengali','Hindi','Mizo','Khasi','Meitei (Manipuri)','Nyishi'],
    excludedExamples:['Bodo','Kokborok','Nagamese','Garo'],
    note:'This is a project engineering threshold, not a linguistic quality guarantee.'
  });
  window.CCNERLanguageRegistry = {
    all: () => languages.slice(),
    implemented: () => sufficient.slice(),
    search: q => {
      const needle = String(q || '').trim().toLocaleLowerCase();
      if (!needle) return languages.slice();
      const nameMatches = languages.filter(x => [x.name,x.native,...x.aliases].join(' ').toLocaleLowerCase().includes(needle));
      return nameMatches.length ? nameMatches : languages.filter(x => x.state.toLocaleLowerCase().includes(needle));
    }
  };
})();
