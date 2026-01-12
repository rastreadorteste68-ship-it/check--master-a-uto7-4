
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronLeft, 
  Camera, 
  Check, 
  Scan,
  FileText,
  Trash2,
  Star,
  Settings2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Edit3,
  CheckCircle2,
  Loader2,
  ListChecks,
  Car,
  Hash,
  Type as TypeIcon,
  X,
  PlusCircle,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import { storage } from '../services/storage';
import { analyzeVehicleImage } from '../services/aiService';
import { ChecklistTemplate, ChecklistField, ServiceOrder, VehicleData, FieldType, FieldOption } from '../types';

const Services: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('run');

  const [view, setView] = useState<'menu' | 'builder' | 'runner'>('menu');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ChecklistTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [clientName, setClientName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [scanningFieldId, setScanningFieldId] = useState<string | null>(null);

  useEffect(() => {
    const ts = storage.getTemplates();
    setTemplates(ts);
    
    if (templateId) {
      const found = ts.find(t => t.id === templateId);
      if (found) startInspection(found);
    }
  }, [templateId]);

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

  const handleEditTemplate = (template: ChecklistTemplate) => {
    setActiveTemplate(JSON.parse(JSON.stringify(template)));
    setView('builder');
  };

  const startInspection = (template: ChecklistTemplate) => {
    setActiveTemplate(JSON.parse(JSON.stringify(template)));
    setFieldValues({});
    setClientName('');
    setView('runner');
    setSearchParams({});
  };

  const addField = (type: FieldType, label: string) => {
    if (!activeTemplate) return;
    const newField: ChecklistField = {
      id: Math.random().toString(36).substr(2, 9),
      label: label,
      type: type,
      required: false,
      options: (type === 'select' || type === 'multiselect') ? [{ id: Date.now().toString(), label: 'Nova Opção', price: 0 }] : undefined
    };
    setActiveTemplate({
      ...activeTemplate,
      fields: [...activeTemplate.fields, newField]
    });
    setEditingFieldId(newField.id);
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

  const updateField = (index: number, updates: Partial<ChecklistField>) => {
    if (!activeTemplate) return;
    const next = [...activeTemplate.fields];
    next[index] = { ...next[index], ...updates };
    setActiveTemplate({ ...activeTemplate, fields: next });
  };

  const addOption = (fieldIndex: number) => {
    if (!activeTemplate) return;
    const fields = [...activeTemplate.fields];
    const field = fields[fieldIndex];
    const newOption: FieldOption = { id: Date.now().toString(), label: 'Nova Opção', price: 0 };
    field.options = [...(field.options || []), newOption];
    setActiveTemplate({ ...activeTemplate, fields });
  };

  const updateOption = (fieldIndex: number, optIndex: number, updates: Partial<FieldOption>) => {
    if (!activeTemplate) return;
    const fields = [...activeTemplate.fields];
    const field = fields[fieldIndex];
    if (field.options) {
      field.options[optIndex] = { ...field.options[optIndex], ...updates };
      setActiveTemplate({ ...activeTemplate, fields });
    }
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    if (!activeTemplate) return;
    const fields = [...activeTemplate.fields];
    const field = fields[fieldIndex];
    if (field.options) {
      field.options.splice(optIndex, 1);
      setActiveTemplate({ ...activeTemplate, fields });
    }
  };

  const removeField = (id: string) => {
    if (!activeTemplate) return;
    setActiveTemplate({ ...activeTemplate, fields: activeTemplate.fields.filter(f => f.id !== id) });
  };

  const saveTemplate = () => {
    if (!activeTemplate) return;
    storage.saveTemplate(activeTemplate);
    setTemplates(storage.getTemplates());
    setView('menu');
  };

  const handleScan = (fieldId: string) => {
    setScanningFieldId(fieldId);
    fileInputRef.current?.click();
  };

  const handleGallery = (fieldId: string) => {
    setScanningFieldId(fieldId);
    galleryInputRef.current?.click();
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const fillCurrentDateTime = (fieldId: string) => {
    const now = new Date();
    // Ajuste de fuso horário para formatar ISO localmente
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    handleFieldChange(fieldId, localISOTime);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scanningFieldId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      const field = activeTemplate?.fields.find(f => f.id === scanningFieldId);
      if (field?.type === 'photo') {
        handleFieldChange(scanningFieldId, reader.result);
        setScanningFieldId(null);
        return;
      }

      setIsAnalyzing(true);
      const data = await analyzeVehicleImage(base64);
      if (data) {
        const newValues = { ...fieldValues };
        if (field?.type === 'ai_placa') newValues[scanningFieldId] = data.placa;
        if (field?.type === 'ai_brand_model') newValues[scanningFieldId] = `${data.marca} ${data.modelo}`;
        if (field?.type === 'ai_imei') newValues[scanningFieldId] = data.imei?.[0] || '';
        setFieldValues(newValues);
      }
      setIsAnalyzing(false);
      setScanningFieldId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const calculateTotal = () => {
    if (!activeTemplate) return 0;
    return activeTemplate.fields.reduce((acc, f) => {
      if (f.type === 'price') return acc + (Number(fieldValues[f.id]) || 0);
      
      if (f.type === 'select' && f.options) {
        const selectedId = fieldValues[f.id];
        const opt = f.options.find(o => o.id === selectedId);
        return acc + (opt?.price || 0);
      }
      
      if (f.type === 'multiselect' && f.options) {
        const selectedIds = fieldValues[f.id] || [];
        const optsPrice = f.options
          .filter(o => selectedIds.includes(o.id))
          .reduce((sum, o) => sum + (o.price || 0), 0);
        return acc + optsPrice;
      }
      
      return acc;
    }, 0);
  };

  const finishInspection = () => {
    if (!activeTemplate || !clientName) return;
    const order: ServiceOrder = {
      id: Date.now().toString(),
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      clientName: clientName,
      vehicle: { placa: fieldValues['placa'] || '', marca: '', modelo: '', imei: [] },
      fields: activeTemplate.fields.map(f => ({ ...f, value: fieldValues[f.id] })),
      totalValue: calculateTotal(),
      status: 'completed',
      date: new Date().toISOString()
    };
    storage.saveOrder(order);
    navigate('/');
  };

  // --- RENDER BUILDER ---
  if (view === 'builder' && activeTemplate) {
    const fieldTypesList: { t: FieldType; l: string }[] = [
      { t: 'text', l: 'Texto Simples' },
      { t: 'number', l: 'Número' },
      { t: 'date', l: 'Data e Hora' },
      { t: 'boolean', l: 'Caixa de Seleção' },
      { t: 'ai_placa', l: 'Placa (Scanner IA)' },
      { t: 'ai_imei', l: 'IMEI (Scanner IA)' },
      { t: 'select', l: 'Seleção Única (+ Preço)' },
      { t: 'multiselect', l: 'Seleção Múltipla (+ Preços)' },
      { t: 'ai_brand_model', l: 'Marca / Modelo (IA)' },
      { t: 'photo', l: 'Captura de Imagem' },
      { t: 'price', l: 'Preço Manual' },
    ];

    return (
      <div className="space-y-6 pb-40 animate-slide-up max-w-2xl mx-auto px-2">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md py-4 z-50">
          <button onClick={() => setView('menu')} className="p-3 text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100"><ChevronLeft /></button>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setActiveTemplate({...activeTemplate, isFavorite: !activeTemplate.isFavorite})} 
                className={`p-3 rounded-2xl transition-all ${activeTemplate.isFavorite ? 'bg-amber-50 text-amber-500 shadow-amber-100' : 'bg-white text-slate-300 border border-slate-100'}`}
             >
                <Star size={20} fill={activeTemplate.isFavorite ? 'currentColor' : 'none'} />
             </button>
             <button onClick={saveTemplate} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all uppercase text-xs tracking-widest">Salvar Modelo</button>
          </div>
        </header>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
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
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-6">Estrutura de Campos</h3>
          {activeTemplate.fields.map((field, idx) => {
            const isEditing = editingFieldId === field.id;
            return (
              <div key={field.id} className={`bg-white rounded-[2.5rem] border transition-all duration-300 overflow-hidden ${isEditing ? 'border-indigo-400 shadow-xl ring-4 ring-indigo-50/50' : 'border-slate-100 shadow-sm'}`}>
                <div className="p-5 flex items-center gap-3">
                  <div className="text-slate-300"><GripVertical size={20} /></div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{field.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{field.type.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveField(idx, 'up')} disabled={idx === 0} className="p-2 text-slate-300 hover:text-indigo-600 disabled:opacity-10"><ChevronUp size={20} /></button>
                    <button onClick={() => moveField(idx, 'down')} disabled={idx === activeTemplate.fields.length - 1} className="p-2 text-slate-300 hover:text-indigo-600 disabled:opacity-10"><ChevronDown size={20} /></button>
                    <button onClick={() => setEditingFieldId(isEditing ? null : field.id)} className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-slate-50'}`}><Edit3 size={18} /></button>
                    <button onClick={() => removeField(field.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>

                {isEditing && (
                  <div className="px-6 pb-6 pt-2 space-y-4 bg-slate-50/50 animate-fade-in">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Rótulo / Pergunta</label>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                      />
                    </div>
                    
                    {(field.type === 'select' || field.type === 'multiselect') && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Opções de Seleção</label>
                          <button 
                            onClick={() => addOption(idx)}
                            className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg flex items-center gap-1"
                          >
                            <PlusCircle size={12} /> ADD OPÇÃO
                          </button>
                        </div>
                        <div className="space-y-2">
                          {field.options?.map((opt, optIdx) => (
                            <div key={opt.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                              <input 
                                className="flex-1 bg-slate-50 border-none rounded-lg py-2 px-3 text-xs font-bold"
                                value={opt.label}
                                onChange={(e) => updateOption(idx, optIdx, { label: e.target.value })}
                                placeholder="Nome da opção"
                              />
                              <div className="flex items-center bg-slate-50 rounded-lg px-2 w-24">
                                <span className="text-[9px] font-black text-slate-400 mr-1">R$</span>
                                <input 
                                  type="number"
                                  className="w-full bg-transparent border-none p-0 text-xs font-black text-indigo-600 focus:ring-0"
                                  value={opt.price}
                                  onChange={(e) => updateOption(idx, optIdx, { price: Number(e.target.value) })}
                                  placeholder="0"
                                />
                              </div>
                              <button 
                                onClick={() => removeOption(idx, optIdx)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer pt-2">
                      <input 
                        type="checkbox" 
                        checked={field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                        className="w-5 h-5 rounded-lg text-indigo-600"
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Campo Obrigatório</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-8 bg-[#F8FAFC] border-2 border-dashed border-slate-200 rounded-[3.5rem] space-y-8 mt-10 shadow-inner">
          <h3 className="text-center text-[13px] font-black text-[#5C728E] uppercase tracking-[0.2em]">Adicionar Novo Campo</h3>
          <div className="grid grid-cols-2 gap-4">
            {fieldTypesList.map(item => (
              <button 
                key={item.t}
                onClick={() => addField(item.t, item.l)}
                className="bg-white border border-slate-200 p-6 rounded-[1.8rem] flex flex-col items-center justify-center gap-2 group active:scale-[0.97] transition-all hover:border-indigo-200 hover:shadow-md shadow-sm"
              >
                <Plus size={22} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-[13px] font-bold text-[#5C728E] text-center leading-tight">{item.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER RUNNER ---
  if (view === 'runner' && activeTemplate) {
    return (
      <div className="space-y-6 pb-32 animate-slide-up max-w-xl mx-auto px-2">
        <header className="flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md py-4 z-50">
          <button onClick={() => setView('menu')} className="p-3 bg-white text-slate-500 rounded-2xl shadow-sm border border-slate-100"><ChevronLeft /></button>
          <div className="text-center">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{activeTemplate.name}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{clientName || 'Executando...'}</p>
          </div>
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-lg font-black shadow-lg">
            <span className="text-xs">R$</span>{calculateTotal()}
          </div>
        </header>

        <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-4">Cliente</label>
             <input 
               className="w-full bg-slate-50 border-none rounded-[2rem] py-5 px-8 text-slate-900 font-black text-lg focus:ring-2 focus:ring-indigo-500"
               value={clientName}
               onChange={e => setClientName(e.target.value)}
               placeholder="Nome do Cliente..."
             />
           </div>
        </section>

        {activeTemplate.fields.map((field) => (
          <div key={field.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-800 text-lg tracking-tight">{field.label}</h4>
                {field.type === 'date' && (
                  <button 
                    onClick={() => fillCurrentDateTime(field.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md shadow-indigo-100 active:scale-90 transition-all"
                  >
                    <Clock size={10} /> Agora
                  </button>
                )}
              </div>
              
              {['ai_placa', 'ai_brand_model', 'ai_imei', 'photo'].includes(field.type) && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleScan(field.id)} 
                    className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                    title="Câmera"
                  >
                    <Camera size={20} />
                  </button>
                  <button 
                    onClick={() => handleGallery(field.id)} 
                    className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                    title="Galeria"
                  >
                    <ImageIcon size={20} />
                  </button>
                </div>
              )}
            </div>
            
            {field.type === 'ai_placa' && fieldValues[field.id] && (
              <div className="placa-mercosul"><div className="texto-placa uppercase">{fieldValues[field.id]}</div></div>
            )}

            {field.type === 'price' && (
              <div className="flex items-center bg-slate-50 rounded-[2rem] px-8 py-5 border border-slate-100">
                <span className="font-black text-slate-400 mr-3 text-lg">R$</span>
                <input 
                  type="number" 
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="bg-transparent border-none p-0 focus:ring-0 font-black text-slate-900 flex-1 text-xl"
                  placeholder="0,00"
                />
              </div>
            )}

            {field.type === 'select' && (
              <div className="grid grid-cols-1 gap-2">
                {field.options?.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleFieldChange(field.id, opt.id)}
                    className={`flex items-center justify-between py-4 px-6 rounded-2xl font-black text-sm transition-all ${fieldValues[field.id] === opt.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                  >
                    <span>{opt.label}</span>
                    {opt.price > 0 && <span>+ R${opt.price}</span>}
                  </button>
                ))}
              </div>
            )}

            {field.type === 'multiselect' && (
              <div className="grid grid-cols-1 gap-2">
                {field.options?.map(opt => {
                  const selected = (fieldValues[field.id] || []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        const current = fieldValues[field.id] || [];
                        const next = selected ? current.filter((id: string) => id !== opt.id) : [...current, opt.id];
                        handleFieldChange(field.id, next);
                      }}
                      className={`flex items-center justify-between py-4 px-6 rounded-2xl font-black text-sm transition-all ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                    >
                      <span>{opt.label}</span>
                      {opt.price > 0 && <span>+ R${opt.price}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {field.type === 'boolean' && (
               <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button 
                      key={String(v)}
                      onClick={() => handleFieldChange(field.id, v)}
                      className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest ${fieldValues[field.id] === v ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {v ? 'Sim' : 'Não'}
                    </button>
                  ))}
               </div>
            )}

            {field.type === 'photo' && (
               <div className="space-y-4">
                  {fieldValues[field.id] ? (
                    <div className="relative">
                      <img src={fieldValues[field.id]} className="w-full h-64 rounded-[2rem] object-cover shadow-lg border-4 border-white" />
                      <button 
                        onClick={() => handleFieldChange(field.id, null)}
                        className="absolute top-4 right-4 p-2 bg-rose-500 text-white rounded-full shadow-lg"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleScan(field.id)} 
                        className="flex-1 py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-all"
                      >
                        <Camera size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Tirar Foto</span>
                      </button>
                      <button 
                        onClick={() => handleGallery(field.id)} 
                        className="flex-1 py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-all"
                      >
                        <ImageIcon size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Abrir Galeria</span>
                      </button>
                    </div>
                  )}
               </div>
            )}

            {['text', 'number', 'date', 'ai_brand_model', 'ai_imei'].includes(field.type) && (
               <input 
                 type={field.type === 'number' ? 'number' : field.type === 'date' ? 'datetime-local' : 'text'}
                 value={fieldValues[field.id] || ''}
                 onChange={(e) => handleFieldChange(field.id, e.target.value)}
                 className="w-full bg-slate-50 border-none rounded-[2rem] py-5 px-8 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                 placeholder="..."
               />
            )}
          </div>
        ))}

        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={onFileChange} />
        <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={onFileChange} />

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent z-40 max-w-xl mx-auto">
          <button 
            onClick={finishInspection}
            className="w-full py-6 rounded-[2.5rem] bg-indigo-600 text-white font-black shadow-2xl uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <CheckCircle2 /> Finalizar Vistoria
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER MENU ---
  return (
    <div className="space-y-8 pb-24 animate-slide-up max-w-4xl mx-auto px-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">CheckMaster</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-1">Modelos de Formulários</p>
        </div>
        <button onClick={handleCreateTemplate} className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-2xl active:scale-95 transition-all">
          <Plus size={32} />
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(template => (
          <div key={template.id} className={`bg-white p-8 rounded-[3.5rem] border shadow-sm space-y-6 group hover:shadow-xl transition-all border-b-8 ${template.isFavorite ? 'border-amber-400' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-900 text-2xl tracking-tighter">{template.name}</h4>
                  {template.isFavorite && <Star size={16} className="text-amber-500" fill="currentColor" />}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{template.fields.length} itens de verificação</p>
              </div>
              <button 
                onClick={() => handleEditTemplate(template)}
                className="p-4 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.8rem] transition-all"
              >
                <Settings2 size={24} />
              </button>
            </div>
            <button 
              onClick={() => startInspection(template)}
              className="w-full bg-slate-50 text-slate-900 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-4"
            >
              <ListChecks size={24} /> Iniciar Vistoria
            </button>
          </div>
        ))}
        
        <button 
          onClick={handleCreateTemplate}
          className="border-4 border-dashed border-slate-200 rounded-[3.5rem] p-12 flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-indigo-400 hover:border-indigo-200 transition-all active:scale-95"
        >
          <Plus size={48} />
          <span className="font-black text-xs uppercase tracking-widest">Criar Novo Formulário</span>
        </button>
      </section>

      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[4rem] text-center space-y-4 animate-in zoom-in duration-300">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
            <h3 className="text-xl font-black text-slate-900">Processando IA...</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Extraindo dados veiculares</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
