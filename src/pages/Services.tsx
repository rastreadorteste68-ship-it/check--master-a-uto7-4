import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Camera, ScanLine, Loader2, CheckCircle2, Plus, Trash2, Save, 
  Settings2, ClipboardList, ChevronLeft, DollarSign, 
  Hash, FileText, ListChecks, Calendar, Type as TypeIcon,
  ChevronDown, X, Info, Car, CheckSquare, Star,
  ChevronUp, GripVertical, Edit3
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
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const allTemplates = storage.getTemplates();
    setTemplates(allTemplates);

    const runId = searchParams.get('run');
    if (runId) {
      const target = allTemplates.find(t => t.id === runId);
      if (target) {
        startInspection(target);
        setSearchParams({});
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
    setEditingFieldId(newField.id); // Abre edição automaticamente para o novo campo
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (!activeTemplate) return;
    const newFields = [...activeTemplate.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    
    setActiveTemplate({ ...activeTemplate, fields: newFields });
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
      <div className="space-y-6 pb-24 animate-slide-up max-w-2xl mx-auto px-2">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md py-4 z-50">
          <button onClick={() => setView('menu')} className="p-3 text-slate-500 hover:text-indigo-600 bg-white rounded-2xl shadow-sm border border-slate-100"><ChevronLeft /></button>
          <div className="flex items-center gap-3">
             <button onClick={toggleFavorite} className={`p-3 rounded-2xl transition-all ${activeTemplate.isFavorite ? 'bg-amber-50 text-amber-500 shadow-amber-100' : 'bg-white text-slate-300 border border-slate-100'}`}>
                <Star size={20} fill={activeTemplate.isFavorite ? 'currentColor' : 'none'} />
             </button>
             <button onClick={saveTemplate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase text-xs tracking-widest">Finalizar</button>
          </div>
        </header>

        <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Título do Checklist</label>
            <input 
              type="text" 
              value={activeTemplate.name}
              onChange={(e) => setActiveTemplate({...activeTemplate, name: e.target.value})}
              className="w-full text-2xl font-black border-none p-2 focus:ring-0 text-slate-900 bg-slate-50 rounded-2xl"
              placeholder="Ex: Vistoria Cautelar"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-6">Estrutura do Formulário</h3>
          {activeTemplate.fields.map((field, idx) => {
            const isEditing = editingFieldId === field.id;
            return (
              <div key={field.id} className={`bg-white rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${isEditing ? 'border-indigo-400 shadow-xl shadow-indigo-50 ring-4 ring-indigo-50/50' : 'border-slate-100 shadow-sm'}`}>
                {/* Header do Campo */}
                <div className="p-4 flex items-center gap-3">
                  <div className="text-slate-300">
                    <GripVertical size={20} />
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{field.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{field.type.replace('ai_', 'IA ').replace('_', ' ')}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveField(idx, 'up')}
                      disabled={idx === 0}
                      className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp size={20} />
                    </button>
                    <button 
                      onClick={() => moveField(idx, 'down')}
                      disabled={idx === activeTemplate.fields.length - 1}
                      className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown size={20} />
                    </button>
                    <button 
                      onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                      className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600 bg-slate-50'}`}
                    >
                      {isEditing ? <CheckSquare size={20} /> : <Edit3 size={20} />}
                    </button>
                    <button onClick={() => removeField(field.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Área de Edição Expandida */}
                {isEditing && (
                  <div className="px-6 pb-6 pt-2 space-y-5 animate-fade-in bg-slate-50/50">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pergunta do Campo</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="Ex: O para-brisa está trincado?"
                      />
                    </div>

                    {(field.type === 'select' || field.type === 'multiselect') && (
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Opções de Seleção</label>
                        {field.options?.map((opt, optIdx) => (
                          <div key={opt.id} className="flex gap-2">
                            <input 
                              className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold"
                              value={opt.label}
                              onChange={(e) => {
                                const nextOpts = [...field.options!];
                                nextOpts[optIdx].label = e.target.value;
                                updateField(idx, { options: nextOpts });
                              }}
                            />
                            <div className="w-24 bg-emerald-50 rounded-xl flex items-center px-2 border border-emerald-100">
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
                            <button 
                              onClick={() => {
                                const next = field.options!.filter((_, i) => i !== optIdx);
                                updateField(idx, { options: next });
                              }}
                              className="p-2 text-slate-300 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addOption(idx)} className="text-indigo-600 text-[10px] font-black uppercase flex items-center gap-1 mt-2 bg-white px-4 py-2 rounded-lg border border-indigo-100 self-start"><Plus size={14}/> Add Nova Opção</button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                       <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-6 rounded-full relative transition-all ${field.required ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${field.required ? 'left-5' : 'left-1'}`} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Obrigatório</span>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={field.required}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                        />
                      </label>
                      <button onClick={() => setEditingFieldId(null)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Concluir Edição</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Builder Grid de Adição */}
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
                <span className="text-center leading-tight">{btn.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // O restante do componente (view Runner e Menu) permanece o mesmo
  if (view === 'runner' && activeTemplate) {
    const isReady = clientName && !activeTemplate.fields.some(f => f.required && !f.value && f.type !== 'ai_placa' && f.type !== 'ai_imei' && f.type !== 'ai_brand_model');

    return (
      <div className="space-y-6 pb-32 animate-slide-up max-w-xl mx-auto px-2">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md py-4 z-50">
          <button onClick={() => setView('menu')} className="p-3 bg-white text-slate-500 rounded-2xl shadow-sm border border-slate-100"><ChevronLeft /></button>
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{activeTemplate.name}</h2>
            <p className="text-[10px] text-slate-500 truncate max-w-[120px] font-bold mt-1 uppercase tracking-wider">{clientName || 'Novo Atendimento'}</p>
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
                {vehicle.placa || (field.type === 'ai_imei' && vehicle.imei.length > 0) ? (
                   <div className="space-y-4 animate-fade-in text-center">
                     {field.type === 'ai_placa' && vehicle.placa && (
                       <div className="placa-mercosul">
                         <div className="texto-placa uppercase">{vehicle.placa}</div>
                       </div>
                     )}
                     {field.type === 'ai_brand_model' && (
                       <div className="grid grid-cols-2 gap-3">
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <span className="text-[10px] font-bold text-slate-400 block mb-1">MARCA</span>
                           <p className="font-black text-slate-800">{vehicle.marca}</p>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <span className="text-[10px] font-bold text-slate-400 block mb-1">MODELO</span>
                           <p className="font-black text-slate-800">{vehicle.modelo}</p>
                         </div>
                       </div>
                     )}
                     {field.type === 'ai_imei' && vehicle.imei.length > 0 && (
                       <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
                         <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">IMEI Detectado</span>
                         <p className="font-black font-mono text-indigo-700 text-lg">{vehicle.imei[0]}</p>
                       </div>
                     )}
                     <button onClick={() => setVehicle({placa:'',marca:'',modelo:'',imei:[]})} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest py-2 active:scale-95 transition-all">Refazer Scanner</button>
                   </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full py-16 border-4 border-dashed border-slate-50 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-indigo-100 hover:text-indigo-500 bg-slate-50/20 transition-all active:scale-[0.98]"
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
              <div className="flex items-center bg-slate-50 rounded-[1.5rem] px-6 py-4 border border-slate-100">
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
              <button className="w-full py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-slate-400 transition-all hover:border-indigo-200">
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
    <div className="space-y-8 pb-24 animate-slide-up max-w-4xl mx-auto px-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">CheckMaster</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-1">
            <Info size={12} className="text-indigo-500" />
            Seus Formulários
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
              <p className="text-slate-400 font-black text-sm uppercase tracking-[0.2em]">Sem modelos ainda</p>
              <button onClick={handleCreateTemplate} className="text-white bg-indigo-600 font-black text-xs uppercase tracking-widest px-8 py-4 rounded-full shadow-lg shadow-indigo-50">Criar Primeiro Modelo</button>
            </div>
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
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{template.fields.length} campos configurados</p>
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
                className="w-full bg-slate-50 text-slate-900 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-4 shadow-sm group-hover:shadow-md active:scale-[0.98]"
              >
                <ListChecks size={24} /> Iniciar Vistoria
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default Services;