
import React, { useEffect, useState } from 'react';
import { 
  Wallet,
  CalendarDays,
  TrendingUp,
  Award,
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
  ChevronRight,
  ChevronLeft,
  ArrowRight
} from 'lucide-react';
import { storage } from '../services/storage';
import { ServiceOrder } from '../types';

interface GroupedFinance {
  clientName: string;
  total: number;
  count: number;
  lastDate: string;
}

const Finance: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedFinance[]>([]);
  const [totalGains, setTotalGains] = useState(0);
  const [selectedDay, setSelectedDay] = useState('Qua');

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  useEffect(() => {
    const savedOrders = storage.getOrders();
    setOrders(savedOrders);
    
    // Calcular Total Geral
    const total = savedOrders.reduce((acc: number, o: ServiceOrder) => acc + (o.totalValue || 0), 0);
    setTotalGains(total);

    // Agrupar por Cliente
    // Fix: Explicitly typing the reduce generic and using a reference to the group to avoid inference issues and 'unknown' errors
    const groups = savedOrders.reduce<Record<string, GroupedFinance>>((acc, order: ServiceOrder) => {
      if (!acc[order.clientName]) {
        acc[order.clientName] = {
          clientName: order.clientName,
          total: 0,
          count: 0,
          lastDate: order.date
        };
      }
      const currentGroup = acc[order.clientName];
      if (currentGroup) {
        currentGroup.total += order.totalValue || 0;
        currentGroup.count += 1;
        currentGroup.lastDate = order.date;
      }
      return acc;
    }, {});

    setGroupedData(Object.values(groups).sort((a, b) => b.total - a.total));
  }, []);

  const exportToExcel = () => {
    const headers = "Cliente,Total,Vistorias,Ultima Atividade\n";
    const rows = groupedData.map(g => 
      `${g.clientName},${g.total},${g.count},${new Date(g.lastDate).toLocaleDateString()}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Financeiro_CheckMaster_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-32 animate-slide-up max-w-4xl mx-auto">
      {/* Header - CheckMaster Style */}
      <header className="flex items-center justify-between px-2 pt-2">
        <h2 className="text-3xl font-black text-[#4f46e5] tracking-tight">CheckMaster</h2>
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
           <Share2 size={24} />
        </div>
      </header>

      {/* Day Selector - Exactly like screenshot */}
      <div className="bg-white rounded-[2.5rem] p-4 border border-slate-100 shadow-sm">
        <div className="flex justify-between px-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`text-sm font-bold py-2 px-4 rounded-2xl transition-all ${
                selectedDay === day 
                ? 'text-indigo-600 bg-indigo-50' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Header */}
      <section className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
         <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Acumulado</span>
         <div className="flex items-baseline gap-2">
            <span className="text-indigo-600 text-2xl font-black">R$</span>
            <h2 className="text-6xl font-black text-slate-900 tracking-tighter">
              {totalGains.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
         </div>
         <div className="flex gap-4 mt-6">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              onClick={printPDF}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
            >
              <FileText size={16} /> PDF / Imprimir
            </button>
         </div>
      </section>

      {/* Grouped List - Fluxo de Caixa Recente */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Fluxo de Caixa Recente</h3>
          <button className="text-indigo-600 text-xs font-black uppercase tracking-widest">Ver Completo</button>
        </div>

        <div className="space-y-4 px-2">
          {groupedData.length === 0 ? (
            <div className="bg-white p-16 rounded-[4rem] border border-dashed border-slate-200 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
              Aguardando primeira vistoria...
            </div>
          ) : (
            groupedData.map((group, idx) => (
              <div 
                key={idx} 
                className="bg-white p-6 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[2.5rem] flex items-center justify-center bg-[#E6F9F3] text-[#10B981] shadow-inner shrink-0">
                    <Wallet size={32} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight leading-none mb-1">{group.clientName}</h4>
                    <p className="text-[11px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
                      Operador: <span className="text-slate-600">SISTEMA</span>
                    </p>
                    <div className="text-[9px] text-slate-300 font-bold mt-1">{new Date(group.lastDate).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="block font-black text-[#10B981] text-2xl tracking-tighter">
                    + R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">{group.count} SERVIÇOS</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Floating Detailed Report Action */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40 print:hidden">
         <button 
           onClick={printPDF}
           className="w-full bg-slate-900 text-white p-6 rounded-[3rem] shadow-2xl flex items-center justify-between group active:scale-95 transition-all"
         >
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white/10 rounded-2xl">
                  <FileText size={20} />
               </div>
               <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-widest opacity-60">Relatório Completo</span>
                  <span className="text-sm font-bold">Enviar detalhado por e-mail</span>
               </div>
            </div>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
         </button>
      </div>
    </div>
  );
};

export default Finance;
