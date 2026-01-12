
import React, { useEffect, useState } from 'react';
import { 
  Wallet,
  FileSpreadsheet,
  FileText,
  Share2,
  ArrowRight,
  X,
  ChevronRight,
  Calendar,
  Clock,
  Car
} from 'lucide-react';
import { storage } from '../services/storage';
import { ServiceOrder } from '../types';

interface GroupedFinance {
  clientName: string;
  total: number;
  count: number;
  lastDate: string;
  orders: ServiceOrder[];
}

const Finance: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedFinance[]>([]);
  const [totalGains, setTotalGains] = useState(0);
  const [selectedClient, setSelectedClient] = useState<GroupedFinance | null>(null);

  useEffect(() => {
    const savedOrders = storage.getOrders();
    setOrders(savedOrders);
    
    // Calcular Total Geral
    const total = savedOrders.reduce((acc: number, o: ServiceOrder) => acc + (o.totalValue || 0), 0);
    setTotalGains(total);

    // Agrupar por Cliente
    const groups = savedOrders.reduce<Record<string, GroupedFinance>>((acc, order: ServiceOrder) => {
      if (!acc[order.clientName]) {
        acc[order.clientName] = {
          clientName: order.clientName,
          total: 0,
          count: 0,
          lastDate: order.date,
          orders: []
        };
      }
      const currentGroup = acc[order.clientName];
      if (currentGroup) {
        currentGroup.total += order.totalValue || 0;
        currentGroup.count += 1;
        currentGroup.lastDate = order.date;
        currentGroup.orders.push(order);
      }
      return acc;
    }, {});

    setGroupedData(Object.values(groups).sort((a, b) => b.total - a.total));
  }, []);

  const exportClientExcel = (group: GroupedFinance) => {
    const headers = "Data,Placa,Servico,Valor\n";
    const rows = group.orders.map(o => {
      const date = new Date(o.date).toLocaleString('pt-BR');
      return `${date},${o.vehicle.placa},${o.templateName},${o.totalValue}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_${group.clientName}_${new Date().toLocaleDateString()}.csv`);
    link.click();
  };

  const printClientPDF = (group: GroupedFinance) => {
    // Definimos o que imprimir temporariamente ou usamos window.print
    // Em um app real, poderíamos abrir uma nova aba formatada
    setSelectedClient(group);
    setTimeout(() => window.print(), 500);
  };

  return (
    <div className="space-y-8 pb-40 animate-slide-up max-w-4xl mx-auto px-2">
      {/* Header - CheckMaster Style */}
      <header className="flex items-center justify-between pt-2 px-4 print:hidden">
        <h2 className="text-3xl font-black text-[#4f46e5] tracking-tight">CheckMaster</h2>
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
           <Share2 size={24} />
        </div>
      </header>

      {/* Main Stats Header - Exactly like the screenshot */}
      <section className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2 print:hidden">
         <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Acumulado</span>
         <div className="flex items-baseline gap-2">
            <span className="text-indigo-600 text-2xl font-black">R$</span>
            <h2 className="text-6xl font-black text-slate-900 tracking-tighter">
              {totalGains.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
         </div>
         <div className="flex gap-4 mt-6">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-[#E6F9F3] text-[#10B981] px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
            >
              <FileText size={16} /> PDF / Imprimir
            </button>
         </div>
      </section>

      {/* Grouped List - Fluxo de Caixa Recente */}
      <section className="space-y-6 print:hidden">
        <div className="flex items-center justify-between px-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Fluxo por Empresa</h3>
          <button className="text-indigo-600 text-xs font-black uppercase tracking-widest">Ver Completo</button>
        </div>

        <div className="space-y-4 px-2">
          {groupedData.length === 0 ? (
            <div className="bg-white p-16 rounded-[4rem] border border-dashed border-slate-200 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
              Aguardando movimentações...
            </div>
          ) : (
            groupedData.map((group, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedClient(group)}
                className="bg-white p-6 rounded-[3.5rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-[#E6F9F3] text-[#10B981] shadow-inner shrink-0">
                    <Wallet size={28} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight leading-none mb-1">{group.clientName}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-2">
                      Operador: <span className="text-slate-600">SISTEMA</span>
                    </p>
                    <div className="text-[9px] text-slate-300 font-bold mt-1 uppercase">Última: {new Date(group.lastDate).toLocaleDateString()}</div>
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
           onClick={() => window.print()}
           className="w-full bg-slate-900 text-white p-6 rounded-[3rem] shadow-2xl flex items-center justify-between group active:scale-95 transition-all"
         >
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white/10 rounded-2xl">
                  <FileText size={20} />
               </div>
               <div className="text-left">
                  <span className="block text-[10px] font-black uppercase tracking-widest opacity-60">Relatório Completo</span>
                  <span className="text-sm font-bold">Enviar detalhado por e-mail</span>
               </div>
            </div>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
         </button>
      </div>

      {/* Client Detail / Print Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end justify-center animate-in fade-in duration-300 print:relative print:bg-white print:p-0 print:block">
          <div className="bg-white w-full max-w-3xl rounded-t-[4rem] p-8 max-h-[90vh] overflow-y-auto shadow-2xl print:max-h-none print:shadow-none print:rounded-none">
            
            <header className="flex items-center justify-between mb-8 print:hidden">
               <button onClick={() => setSelectedClient(null)} className="p-4 bg-slate-50 rounded-2xl text-slate-400"><X /></button>
               <div className="text-center">
                  <h3 className="font-black text-slate-900 text-2xl">{selectedClient.clientName}</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Extrato de Serviços</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => exportClientExcel(selectedClient)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><FileSpreadsheet size={20}/></button>
                 <button onClick={() => window.print()} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><FileText size={20}/></button>
               </div>
            </header>

            <div className="print:block hidden mb-10 border-b-4 border-slate-900 pb-6">
               <h1 className="text-4xl font-black text-indigo-600">CheckMaster Auto</h1>
               <div className="mt-4 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedClient.clientName}</h2>
                    <p className="text-slate-500 font-bold">Relatório de Vistorias Detalhado</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Emissão</p>
                    <p className="font-black text-slate-900">{new Date().toLocaleDateString()}</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               {selectedClient.orders.map((order, i) => (
                 <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 print:bg-white print:border-slate-200">
                    <div className="flex items-center gap-4">
                       <div className="p-4 bg-white rounded-2xl text-slate-400 print:border">
                          <Car size={24} />
                       </div>
                       <div>
                          <h5 className="font-black text-slate-900 text-lg uppercase">{order.vehicle.placa || 'SEM PLACA'}</h5>
                          <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(order.date).toLocaleDateString()}</span>
                             <span className="flex items-center gap-1"><Clock size={12}/> {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold text-slate-500 mb-1">{order.templateName}</p>
                       <p className="font-black text-slate-900 text-xl">R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-10 pt-10 border-t-2 border-slate-100 flex flex-col items-center">
               <div className="w-full flex justify-between items-center mb-8">
                  <span className="text-lg font-black text-slate-400 uppercase tracking-widest">Total Geral a Receber</span>
                  <span className="text-4xl font-black text-indigo-600 tracking-tighter">R$ {selectedClient.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
               </div>
               
               <div className="hidden print:block text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-20">
                  Documento gerado automaticamente via CheckMaster Auto PWA
               </div>
               
               <button 
                 onClick={() => setSelectedClient(null)}
                 className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl print:hidden"
               >
                 Fechar Detalhes
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS overrides for print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root, .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Finance;
