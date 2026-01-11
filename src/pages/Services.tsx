import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Camera, ScanLine, Loader2, CheckCircle2, Plus, Trash2, Save, 
  Settings2, ClipboardList, ChevronLeft, DollarSign, 
  Hash, FileText, ListChecks, Calendar, Type as TypeIcon,
  ChevronDown, X, Info, Car, CheckSquare, Star
} from 'lucide-react';
import { analyzeVehicleImage } from '../services/aiService';
import { storage } from '../services/storage';
import { ChecklistTemplate, ChecklistField, ServiceOrder, VehicleData, FieldType } from '../types';

const Services: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'menu' | 'builder' | 'runner'>('menu');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleData>({ placa: '', marca: '', modelo: '', imei: [] });
  const [clientName, setClientName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const allTemplates = storage.getTemplates();
    setTemplates(allTemplates);

    // Deep link: Se a URL tiver ?run=ID, inicia a vistoria imediatamente
    const runId = searchParams.get('run');
    if (runId) {
      const target = allTemplates.find(t => t.id === runId);
      if (target) {
        startInspection(target);
        setSearchParams({}); // Limpa os parâmetros
      }
    }
  }, [searchParams]);

  const handleCreateTemplate = () => {
    const newTemplate: ChecklistTemplate = {
      id: Date.now().toString(),
      name: 'Novo Checklist',
      description: 'Modelo customizado',
      fields: [],
      isFavorite: false
    };
    setActiveTemplate(newTemplate);
    setView('builder');
  };

  const startInspection = (template: ChecklistTemplate) => {
    setActiveTemplate(JSON.parse(JSON.stringify(template)));
    setVehicle({ placa: '', marca: '', modelo: '', imei: [] });
    setClientName('');
    setView('runner');
  };

  const addField = (type: FieldType, label: string) => {
    if (!activeTemplate) return;
    const newField: ChecklistField = {
      id: Math.random().toString(36).substr(2, 9),
      label: label,
      type: type,
      required: false,
      options: (type === 'select' || type === 'multiselect') ? [{ id: 'opt1', label: 'Opção 1', price: 0 }] : undefined
    };
    setActiveTemplate({
      ...activeTemplate,
      fields: [...activeTemplate.fields, newField]
    });
  };

  const removeField = (id: string) => {
    if (!activeTemplate) return;
    setActiveTemplate({
      ...activeTemplate,
      fields: activeTemplate.fields.filter(f => f.id !== id)
    });
  };

  const updateField = (index: number, updates: Partial<ChecklistField>) => {
    if (!activeTemplate) return;
    const next = [...activeTemplate.fields];
    next[index] = { ...next[index], ...updates };
    setActiveTemplate({ ...activeTemplate, fields: next });
  };

  const toggleFavorite = () => {
    if (!activeTemplate) return;
    setActiveTemplate({ ...activeTemplate, isFavorite: !activeTemplate.isFavorite });
  };

  const addOption = (fieldIndex: number) => {
    if (!activeTemplate) return;
    const field = activeTemplate.fields[fieldIndex];
    const nextOptions = [...(field.options || []), { id: Date.now().toString(), label: 'Nova Opção', price: 0 }];
    updateField(fieldIndex, { options: nextOptions });
  };

  const calculateTotal = () => {
    if (!activeTemplate) return 0;
    return activeTemplate.fields.reduce((acc, field) => {
      if (field.type === 'price' && field.value) return acc + parseFloat(field.value);
      if (field.type === 'select' && field.value) {
        const opt = field.options?.find(o => o.label === field.value);
        return acc + (opt?.price || 0);
      }
      if (field.type === 'multiselect' && Array.isArray(field.value)) {
        const selectedPrices = field.value.map(val => field.options?.find(o => o.label === val)?.price || 0);
        return acc + selectedPrices.reduce((s, p) => s + p, 0);
      }
      return acc;
    }, 0);
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await analyzeVehicleImage(base64);
      if (result) setVehicle(result);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveTemplate = () => {
    if (!activeTemplate) return;
    storage.saveTemplate(activeTemplate);
    setTemplates(storage.getTemplates());
    setView('menu');
  };

  const finishInspection = () => {
    if (!activeTemplate || !clientName) return;
    const order: ServiceOrder = {
      id: Date.now().toString(),
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      clientName: clientName,
      vehicle: vehicle,
      fields: JSON.parse(JSON.stringify(activeTemplate.fields)),
      totalValue: calculateTotal(),
      status: 'completed',
      date: new Date().toISOString()
    };
    storage.saveOrder(order);
    setView('menu');
  };

  if (view === 'builder' && activeTemplate) {
    return (
      <div className="space-y-6 pb-24 animate-slide-up max-w-2xl mx-auto">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-50">
          <button onClick={() => setView('menu')} className="p-3 text-slate-500 hover:text-indigo-600 bg-white rounded-2xl shadow-sm"><ChevronLeft /></button>
          <div className="flex items-center gap-3">
             <button onClick={toggleFavorite} className={`p-3 rounded-2xl transition-all ${activeTemplate.isFavorite ? 'bg-amber-50 text-amber-500' : 'bg-white text-slate-300'}`}>
                <Star size={20} fill={activeTemplate.isFavorite ? 'currentColor' : 'none'} />
             </button>
             <button onClick={saveTemplate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase text-xs tracking-widest">Salvar</button>
          </div>
        </header>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Título do Modelo</label>
            <input 
              type="text" 
              value={activeTemplate.name}
              onChange={(e) => setActiveTemplate({...activeTemplate, name: e.target.value})}
              className="w-full text-2xl font-black border-none p-2 focus:ring-0 text-slate-900 bg-slate-50 rounded-2xl"
              placeholder="Ex: Instalação Rastreador"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descrição</label>
            <input 
              type="text" 
              value={activeTemplate.description}
              onChange={(e) => setActiveTemplate({...activeTemplate, description: e.target.value})}
              className="w-full text-slate-600 border-none p-2 focus:ring-0 bg-slate-50 rounded-2xl font-medium"
              placeholder="O que será verificado..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-6">Campos Adicionados</h3>
          {activeTemplate.fields.map((field, idx) => (
            <div key={field.id} className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm space-y-4 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">{idx + 1}</span>
                  <input 
                    className="font-bold text-slate-900 border-none p-0 focus:ring-0 bg-transparent flex-1 text-lg"
                    value={field.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                  />
                </div>
                <button onClick={() => removeField(field.id)} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
              </div>

              {(field.type === 'select' || field.type === 'multiselect') && (
                <div className="space-y-3 pl-14 pr-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Opções e Valores</span>
                  {field.options?.map((opt, optIdx) => (
                    <div key={opt.id} className="flex gap-2">
                      <input 
                        className="flex-1 bg-slate-50 border-none rounded-xl py-2 px-3 text-sm font-bold"
                        value={opt.label}
                        onChange={(e) => {
                          const nextOpts = [...field.options!];
                          nextOpts[optIdx].label = e.target.value;
                          updateField(idx, { options: nextOpts });
                        }}
                      />
                      <div className="w-24 bg-emerald-50 rounded-xl flex items-center px-2 text-slate-900">
                        <span className="text-emerald-600 font-bold text-xs">R$</span>
                        <input 
                          type="number"
                          className="bg-transparent border-none p-1 focus:ring-0 text-xs font-black text-emerald-700 w-full"
                          value={opt.price}
                          onChange={(e) => {
                            const nextOpts = [...field.options!];
                            nextOpts[optIdx].price = parseFloat(e.target.value) || 0;
                            updateField(idx, { options: nextOpts });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addOption(idx)} className="text-indigo-600 text-[10px] font-black uppercase flex items-center gap-1 mt-2"><Plus size={14}/> Add Opção</button>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50/50 px-4 py-1.5 rounded-full uppercase tracking-widest">{field.type.replace('_', ' ')}</span>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Obrigatório</span>
                  <input 
                    type="checkbox" 
                    checked={field.required}
                    onChange={(e) => updateField(idx, { required: e.target.checked })}
                    className="w-5 h-5 rounded-lg text-indigo-600 border-slate-200 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Builder Grid */}
        <div className="p-8 bg-white border border-slate-100 rounded-[3.5rem] shadow-sm space-y-6">
          <h3 className="text-center text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Adicionar Novo Campo</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { t: 'text', i: <Plus size={18}/>, l: 'Texto Simples', def: 'Nova Pergunta' },
              { t: 'number', i: <Plus size={18}/>, l: 'Número', def: 'Quantidade' },
              { t: 'date', i: <Plus size={18}/>, l: 'Data', def: 'Data da Inspeção' },
              { t: 'boolean', i: <Plus size={18}/>, l: 'Caixa de Seleção', def: 'Item verificado?' },
              { t: 'ai_placa', i: <Plus size={18}/>, l: 'Placa (Scanner IA)', def: 'Placa do Veículo' },
              { t: 'ai_imei', i: <Plus size={18}/>, l: 'IMEI (Scanner IA)', def: 'IMEI do Equipamento' },
              { t: 'select', i: <Plus size={18}/>, l: 'Seleção Única (+ Preço)', def: 'Serviço Selecionado' },
              { t: 'multiselect', i: <Plus size={18}/>, l: 'Seleção Múltipla (+ Preços)', def: 'Acessórios' },
              { t: 'ai_brand_model', i: <Plus size={18}/>, l: 'Marca / Modelo (IA)', def: 'Dados do Carro' },
              { t: 'photo', i: <Plus size={18}/>, l: 'Captura de Imagem', def: 'Foto da Vistoria' },
              { t: 'price', i: <Plus size={18}/>, l: 'Preço Manual', def: 'Valor do Serviço' },
            ].map(btn => (
              <button 
                key={btn.t}
                onClick={() => addField(btn.t as FieldType, btn.def)}
                className="bg-white border border-slate-100 p-5 rounded-[1.8rem] flex flex-col items-center justify-center gap-2 text-[11px] font-bold text-slate-600 shadow-sm active:scale-95 transition-all hover:bg-slate-50 hover:border-indigo-100 min-h-[90px]"
              >
                <span className="text-indigo-400">{btn.i}</span>
                <span className="text-center">{btn.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'runner' && activeTemplate) {
    const isReady = clientName && !activeTemplate.fields.some(f => f.required && !f.value && f.type !== 'ai_placa' && f.type !== 'ai_imei' && f.type !== 'ai_brand_model');

    return (
      <div className="space-y-6 pb-32 animate-slide-up max-w-xl mx-auto">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md py-4 z-50 px-2">
          <button onClick={() => setView('menu')} className="p-3 bg-white text-slate-500 rounded-2xl shadow-sm"><ChevronLeft /></button>
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{activeTemplate.name}</h2>
            <p className="text-xs text-slate-500 truncate max-w-[150px]">{clientName || 'Novo Atendimento'}</p>
          </div>
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-lg font-black shadow-lg shadow-emerald-100 flex items-center gap-1">
            <span className="text-xs">R$</span>{calculateTotal()}
          </div>
        </header>

        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-4">Cliente / Proprietário</label>
             <input 
               className="w-full bg-slate-50 border-none rounded-[2rem] py-5 px-8 text-slate-900 font-black text-lg focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
               value={clientName}
               onChange={e => setClientName(e.target.value)}
               placeholder="Digite o nome..."
             />
           </div>
        </section>

        {activeTemplate.fields.map((field, idx) => (
          <div key={field.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between px-2">
              <h4 className="font-black text-slate-800 text-lg tracking-tight">{field.label}</h4>
              {field.required && <span className="text-[9px] bg-red-50 text-red-500 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">Obrigatório</span>}
            </div>
            
            {(field.type === 'ai_placa' || field.type === 'ai_imei' || field.type === 'ai_brand_model') && (
              <div className="space-y-4">
                {vehicle.placa || vehicle.imei.length > 0 ? (
                   <div className="space-y-4 animate-fade-in text-center">
                     {field.type === 'ai_placa' && vehicle.placa && (
                       <div className="placa-mercosul">
                         <div className="texto-placa uppercase">{vehicle.placa}</div>
                       </div>
                     )}
                     {field.type === 'ai_brand_model' && (
                       <div className="grid grid-cols-2 gap-3">
                         <div className="bg-slate-50 p-4 rounded-2xl">
                           <span className="text-[10px] font-bold text-slate-400">MARCA</span>
                           <p className="font-black">{vehicle.marca}</p>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl">
                           <span className="text-[10px] font-bold text-slate-400">MODELO</span>
                           <p className="font-black">{vehicle.modelo}</p>
                         </div>
                       </div>
                     )}
                     {field.type === 'ai_imei' && vehicle.imei.length > 0 && (
                       <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                         <span className="text-[10px] font-bold text-indigo-400">IMEI</span>
                         <p className="font-black font-mono">{vehicle.imei[0]}</p>
                       </div>
                     )}
                     <button onClick={() => setVehicle({placa:'',marca:'',modelo:'',imei:[]})} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">Refazer Scanner</button>
                   </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full py-16 border-4 border-dashed border-slate-50 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-indigo-100 bg-slate-50/20"
                  >
                    {loading ? <Loader2 className="animate-spin text-indigo-500" size={48} /> : <><ScanLine size={56} /> <span className="font-black text-xs uppercase tracking-[0.2em]">{field.label}</span></>}
                  </button>
                )}
              </div>
            )}

            {field.type === 'boolean' && (
              <div className="flex justify-end pr-4">
                <button 
                  onClick={() => {
                    const next = [...activeTemplate.fields];
                    next[idx].value = !next[idx].value;
                    setActiveTemplate({...activeTemplate, fields: next});
                  }}
                  className={`w-20 h-10 rounded-full relative transition-all duration-300 ${field.value ? 'bg-indigo-600 shadow-xl shadow-indigo-100' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${field.value ? 'left-11' : 'left-1'}`}>
                    {field.value && <CheckCircle2 size={16} className="text-indigo-600" />}
                  </div>
                </button>
              </div>
            )}

            {field.type === 'select' && (
              <div className="grid grid-cols-1 gap-2">
                {field.options?.map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => {
                      const next = [...activeTemplate.fields];
                      next[idx].value = opt.label;
                      setActiveTemplate({...activeTemplate, fields: next});
                    }}
                    className={`w-full p-5 rounded-[1.8rem] flex items-center justify-between font-bold transition-all border-2 ${
                      field.value === opt.label ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-50 bg-slate-50 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.price > 0 && <span className="text-emerald-500 text-xs font-black">+ R${opt.price}</span>}
                  </button>
                ))}
              </div>
            )}

            {field.type === 'multiselect' && (
              <div className="grid grid-cols-1 gap-2">
                {field.options?.map(opt => {
                  const isSelected = Array.isArray(field.value) && field.value.includes(opt.label);
                  return (
                    <button 
                      key={opt.id}
                      onClick={() => {
                        const next = [...activeTemplate.fields];
                        const current = Array.isArray(field.value) ? field.value : [];
                        next[idx].value = isSelected ? current.filter(v => v !== opt.label) : [...current, opt.label];
                        setActiveTemplate({...activeTemplate, fields: next});
                      }}
                      className={`w-full p-5 rounded-[1.8rem] flex items-center justify-between font-bold transition-all border-2 ${
                        isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50 bg-slate-50 text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.price > 0 && <span className="text-emerald-500 text-xs font-black">+ R${opt.price}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {(field.type === 'price' || field.type === 'number') && (
              <div className="flex items-center bg-slate-50 rounded-[2rem] px-8 py-5 focus-within:ring-2 focus-within:ring-indigo-500 transition-all border border-slate-100">
                {field.type === 'price' && <span className="font-black text-slate-400 mr-3 text-lg">R$</span>}
                <input 
                  type="number" 
                  value={field.value || ''}
                  onChange={(e) => {
                    const next = [...activeTemplate.fields];
                    next[idx].value = e.target.value;
                    setActiveTemplate({...activeTemplate, fields: next});
                  }}
                  className="bg-transparent border-none p-0 focus:ring-0 font-black text-slate-900 flex-1 text-xl"
                  placeholder="0,00"
                />
              </div>
            )}
            
            {field.type === 'text' && (
              <input 
                className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 px-6 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
                placeholder="Preencha o detalhe..."
                value={field.value || ''}
                onChange={(e) => {
                  const next = [...activeTemplate.fields];
                  next[idx].value = e.target.value;
                  setActiveTemplate({...activeTemplate, fields: next});
                }}
              />
            )}

            {field.type === 'date' && (
              <div className="flex items-center bg-slate-50 rounded-[1.5rem] px-6 py-4">
                <Calendar className="text-indigo-400 mr-3" size={20} />
                <input 
                  type="date"
                  className="bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-900 flex-1"
                  value={field.value || ''}
                  onChange={(e) => {
                    const next = [...activeTemplate.fields];
                    next[idx].value = e.target.value;
                    setActiveTemplate({...activeTemplate, fields: next});
                  }}
                />
              </div>
            )}
            
            {field.type === 'photo' && (
              <button className="w-full py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-slate-400">
                <Camera size={32} />
                <span className="font-black text-xs uppercase tracking-widest">Anexar Foto</span>
              </button>
            )}
          </div>
        ))}

        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageCapture} />

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-40 max-w-xl mx-auto">
          <button 
            onClick={finishInspection}
            disabled={!isReady}
            className={`w-full py-6 rounded-[2.5rem] font-black shadow-2xl transition-all uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 ${
              isReady ? 'bg-indigo-600 text-white shadow-indigo-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> Finalizar e Salvar</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-slide-up max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">CheckMaster</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-1">
            <Info size={12} className="text-indigo-500" />
            Modelos de Inspeção
          </p>
        </div>
        <button onClick={handleCreateTemplate} className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-100 active:scale-95 transition-all">
          <Plus size={32} />
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.length === 0 ? (
          <div className="col-span-full bg-white p-16 rounded-[4rem] border-4 border-dashed border-slate-100 text-center space-y-6 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200 border-2 border-white">
              <ClipboardList size={48} />
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 font-black text-sm uppercase tracking-[0.2em]">Fluxo de trabalho vazio</p>
              <p className="text-slate-300 text-xs font-medium">Crie seu primeiro modelo de checklist para começar a faturar.</p>
            </div>
            <button onClick={handleCreateTemplate} className="text-white bg-indigo-600 font-black text-xs uppercase tracking-widest px-8 py-4 rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-50">Criar Primeiro Modelo</button>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className={`bg-white p-8 rounded-[3.5rem] border shadow-sm space-y-6 group hover:shadow-xl transition-all border-b-8 ${template.isFavorite ? 'border-amber-400' : 'border-slate-100'} hover:border-b-indigo-600`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 text-2xl tracking-tighter">{template.name}</h4>
                    {template.isFavorite && <Star size={16} className="text-amber-500" fill="currentColor" />}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{template.fields.length} itens de verificação</p>
                </div>
                <button 
                  onClick={() => { setActiveTemplate(template); setView('builder'); }}
                  className="p-4 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.8rem] transition-all"
                >
                  <Settings2 size={24} />
                </button>
              </div>
              <button 
                onClick={() => startInspection(template)}
                className="w-full bg-slate-50 text-slate-900 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-4 shadow-sm group-hover:shadow-md"
              >
                <ListChecks size={24} /> Nova Vistoria
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Services;