import React, { useEffect, useState } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet,
  CalendarDays,
  MoreVertical,
  TrendingUp,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { storage } from '../services/storage';
import { ServiceOrder } from '../types';

const Finance: React.FC = () => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [totalGains, setTotalGains] = useState(0);

  useEffect(() => {
    const savedOrders = storage.getOrders();
    setOrders(savedOrders);
    const total = savedOrders.reduce((acc: number, o: ServiceOrder) => acc + (o.totalValue || 0), 0);
    setTotalGains(total);
  }, []);

  const data = [
    { name: 'Seg', val: 120 },
    { name: 'Ter', val: 250 },
    { name: 'Qua', val: 180 },
    { name: 'Qui', val: 320 },
    { name: 'Sex', val: 400 },
    { name: 'Sáb', val: 150 },
    { name: 'Dom', val: 50 },
  ];

  return (
    <div className="space-y-8 pb-24 animate-slide-up max-w-4xl mx-auto">
      <header className="flex flex-col gap-2">
        <span className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">Faturamento Total</span>
        <div className="flex items-baseline gap-2">
          <span className="text-indigo-600 text-2xl font-black">R$</span>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
            {totalGains.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-emerald-500 p-8 rounded-[3.5rem] text-white shadow-2xl shadow-emerald-100 flex flex-col justify-between aspect-[16/9]">
          <div className="flex items-center justify-between">
            <ArrowUpCircle size={36} />
            <Award size={24} className="opacity-40" />
          </div>
          <div>
            <span className="block text-emerald-100 text-[10px] font-black uppercase tracking-widest">Receita Acumulada</span>
            <span className="text-3xl font-black tracking-tight">R$ {totalGains.toFixed(0)}</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col justify-between aspect-[16/9]">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-[1.2rem] flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="text-slate-200 font-black text-4xl"># {orders.length}</span>
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-black uppercase tracking-widest">Serviços Concluídos</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight">{orders.length} <span className="text-sm text-slate-400 font-bold uppercase ml-1">Vistorias</span></span>
          </div>
        </div>
      </div>

      <section className="bg-white p-8 rounded-[4rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-10 px-2">
          <h3 className="font-black text-slate-800 text-xl tracking-tight">Desempenho Diário</h3>
          <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl">
            <CalendarDays size={24} />
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={15} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="val" radius={[12, 12, 12, 12]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 4 ? '#4f46e5' : '#f1f5f9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-6">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">Fluxo de Caixa Recente</h3>
          <button className="text-indigo-600 text-xs font-black uppercase tracking-widest">Ver Completo</button>
        </div>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white p-12 rounded-[3.5rem] border border-dashed border-slate-100 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Aguardando primeira vistoria...</div>
          ) : (
            orders.slice().reverse().slice(0, 10).map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm flex items-center gap-5 group transition-all hover:scale-[1.02]">
                <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-emerald-50 text-emerald-500 shadow-inner">
                  <Wallet size={28} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 text-lg tracking-tighter">{order.templateName}</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{order.clientName}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="block font-black text-emerald-500 text-xl tracking-tighter">
                    + R$ {order.totalValue.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">{new Date(order.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Finance;