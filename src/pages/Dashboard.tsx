import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ClipboardCheck, 
  Users, 
  Plus, 
  ChevronRight,
  Car,
  Star,
  Zap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';
import { ChecklistTemplate, ServiceOrder } from '../types';

const Dashboard: React.FC = () => {
  const [favorites, setFavorites] = useState<ChecklistTemplate[]>([]);
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState({ today: 0, gains: 0, clients: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const templates = storage.getTemplates();
    setFavorites(templates.filter(t => t.isFavorite));

    const orders = storage.getOrders();
    setRecentOrders(orders.slice().reverse().slice(0, 5));

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter((o: ServiceOrder) => o.date.startsWith(todayStr));
    const totalGains = orders.reduce((acc: number, o: ServiceOrder) => acc + (o.totalValue || 0), 0);
    
    setStats({
      today: todayOrders.length,
      gains: totalGains,
      clients: new Set(orders.map((o: ServiceOrder) => o.clientName)).size
    });
  }, []);

  const shortcutColors = [
    'bg-indigo-600 shadow-indigo-200',
    'bg-emerald-600 shadow-emerald-200',
    'bg-amber-500 shadow-amber-200',
    'bg-rose-500 shadow-rose-200',
  ];

  return (
    <div className="space-y-8 animate-slide-up pb-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Olá, Perito! 👋</h2>
            <p className="text-slate-500 text-sm font-medium">Pronto para mais uma vistoria?</p>
          </div>
          <Link to="/services" className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-indigo-600 active:scale-95 transition-all">
            <Plus size={24} />
          </Link>
        </div>

        {/* Atalhos Rápidos */}
        {favorites.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <Zap size={12} className="text-amber-500" /> Atalhos Rápidos
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide">
              {favorites.map((template, idx) => (
                <button
                  key={template.id}
                  onClick={() => navigate(`/services?run=${template.id}`)}
                  className={`${shortcutColors[idx % shortcutColors.length]} min-w-[160px] p-6 rounded-[2.5rem] text-left text-white shadow-xl active:scale-95 transition-all flex flex-col justify-between aspect-[4/5]`}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Star size={20} fill="currentColor" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg leading-tight mb-1">{template.name}</h4>
                    <span className="text-[10px] font-bold uppercase opacity-60">{template.fields.length} itens</span>
                  </div>
                </button>
              ))}
              <Link
                to="/services"
                className="min-w-[160px] p-6 rounded-[2.5rem] bg-white border border-dashed border-slate-200 text-slate-400 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all aspect-[4/5]"
              >
                <Plus size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Ver Todos</span>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Hoje', value: stats.today, icon: <ClipboardCheck />, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Ganhos', value: `R$ ${stats.gains}`, icon: <TrendingUp />, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Fidelidade', value: stats.clients, icon: <Users />, color: 'bg-blue-50 text-blue-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-2">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{stat.label}</span>
              <span className="text-sm font-black text-slate-800 truncate w-full">{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Últimas Atividades</h3>
          <Link to="/finance" className="text-indigo-600 text-xs font-bold">Ver Histórico</Link>
        </div>

        <div className="space-y-3">
          {recentOrders.length === 0 ? (
            <div className="bg-white p-10 rounded-[3rem] border border-dashed border-slate-100 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
              Nenhuma vistoria recente
            </div>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className="group bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 active:scale-[0.98]">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                  <Car size={28} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-800">{order.vehicle.placa || 'Sem Placa'}</h4>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">{order.clientName}</p>
                </div>
                <div className="text-right">
                  <span className="block text-emerald-500 font-black text-sm">R$ {order.totalValue}</span>
                  <ChevronRight size={18} className="inline text-slate-200" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Dica do Especialista */}
      <section className="bg-slate-900 text-white p-8 rounded-[3rem] relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="relative z-10 space-y-2">
          <div className="bg-indigo-500 w-10 h-10 rounded-2xl flex items-center justify-center mb-4">
             <Zap size={20} className="text-white" />
          </div>
          <h4 className="font-black text-xl tracking-tight">Dica de Produtividade</h4>
          <p className="text-slate-400 text-sm leading-relaxed">Fixe seus modelos mais usados na Home usando a <span className="text-indigo-400 font-bold">estrela</span> no Builder. Inicie vistorias com um toque.</p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl"></div>
      </section>
    </div>
  );
};

export default Dashboard;