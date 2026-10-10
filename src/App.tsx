import React, { useState, useEffect, useMemo } from 'react';
import { Plus, AlertCircle, Calendar, DollarSign, Shield, ShieldAlert, ShieldCheck, Trash2, RefreshCw, Info } from 'lucide-react';

type BillingCycle = 'Monthly' | 'Yearly';

interface Subscription {
  id: string;
  name: string;
  cost: number;
  cycle: BillingCycle;
  renewalDate: string;
  isFreeTrial: boolean;
  autoCancel: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateString + 'T00:00:00')); // avoid timezone offset issues
};

export default function App() {
  const [subs, setSubs] = useState<Subscription[]>(() => {
    const saved = localStorage.getItem('subshield_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('subshield_data', JSON.stringify(subs));
  }, [subs]);

  // Form State
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('Monthly');
  const [renewalDate, setRenewalDate] = useState('');
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [autoCancel, setAutoCancel] = useState(false);

  // Handle Free Trial toggle side effect
  useEffect(() => {
    if (isFreeTrial) {
      setAutoCancel(true);
    }
  }, [isFreeTrial]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost || !renewalDate) return;

    const newSub: Subscription = {
      id: crypto.randomUUID(),
      name,
      cost: parseFloat(cost),
      cycle,
      renewalDate,
      isFreeTrial,
      autoCancel
    };

    setSubs([...subs, newSub]);
    setIsFormOpen(false);
    // Reset form
    setName('');
    setCost('');
    setCycle('Monthly');
    setRenewalDate('');
    setIsFreeTrial(false);
    setAutoCancel(false);
  };

  const handleDelete = (id: string) => {
    setSubs(subs.filter(s => s.id !== id));
  };

  const handleToggleAutoCancel = (id: string) => {
    setSubs(subs.map(s => s.id === id ? { ...s, autoCancel: !s.autoCancel } : s));
  };

  // Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const processedSubs = useMemo(() => {
    return subs.map(sub => {
      const renewal = new Date(sub.renewalDate + 'T00:00:00');
      const diffTime = renewal.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let status: 'Active' | 'Canceled' | 'Overdue' = 'Active';
      if (diffDays < 0) {
        status = 'Overdue';
      } else if (sub.autoCancel && diffDays <= 1) {
        status = 'Canceled';
      }

      const isWarning = status === 'Active' && !sub.autoCancel && diffDays >= 0 && diffDays <= 3;

      return {
        ...sub,
        diffDays,
        status,
        isWarning
      };
    }).sort((a, b) => {
      return new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime();
    });
  }, [subs, today]);

  const calculateBurnRate = () => {
    return processedSubs.reduce((acc, sub) => {
      if (sub.status === 'Canceled') return acc;
      const monthlyCost = sub.cycle === 'Yearly' ? sub.cost / 12 : sub.cost;
      return acc + monthlyCost;
    }, 0);
  };

  const burnRate = calculateBurnRate();
  const activeCount = processedSubs.filter(s => s.status === 'Active').length;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-200">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-semibold tracking-tight text-stone-900">SubShield</h1>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Subscription
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-stone-500 mb-4">
              <DollarSign className="w-5 h-5" />
              <h2 className="text-sm font-medium uppercase tracking-wider">Monthly Burn Rate</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light tracking-tight">{formatCurrency(burnRate)}</span>
              <span className="text-stone-400 text-sm">/mo</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-stone-500 mb-4">
              <RefreshCw className="w-5 h-5" />
              <h2 className="text-sm font-medium uppercase tracking-wider">Active Subs</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light tracking-tight">{activeCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 flex flex-col justify-between">
             <div className="flex items-center gap-2 text-stone-500 mb-4">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-sm font-medium uppercase tracking-wider">3-Day Alerts</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light tracking-tight text-orange-600">
                {processedSubs.filter(s => s.isWarning).length}
              </span>
              <span className="text-stone-400 text-sm">Action needed</span>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {processedSubs.filter(s => s.isWarning).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">Action Required</h3>
            {processedSubs.filter(s => s.isWarning).map(sub => (
              <div key={`alert-${sub.id}`} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-orange-900">Upcoming Charge: {formatCurrency(sub.cost)} in {sub.diffDays} {sub.diffDays === 1 ? 'day' : 'days'}.</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    {sub.name} is renewing on {formatDate(sub.renewalDate)}. Check your bank balance or cancel now!
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscriptions List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-stone-900">Upcoming Renewals</h3>
          </div>
          
          {processedSubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 border-dashed p-12 text-center">
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6 text-stone-400" />
              </div>
              <h3 className="text-base font-medium text-stone-900 mb-1">No subscriptions yet</h3>
              <p className="text-sm text-stone-500 mb-4">Add your first subscription to start tracking your burn rate.</p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Subscription
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-stone-100">
                {processedSubs.map(sub => (
                  <div key={sub.id} className={`p-4 sm:p-6 transition-colors hover:bg-stone-50 ${sub.status === 'Canceled' ? 'opacity-60 grayscale' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Info */}
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          sub.status === 'Canceled' ? 'bg-stone-100 text-stone-500' :
                          sub.isFreeTrial ? 'bg-orange-100 text-orange-600' : 
                          sub.cost > 50 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-medium text-stone-900">{sub.name}</h4>
                            {sub.isFreeTrial && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                Free Trial
                              </span>
                            )}
                            {sub.status === 'Canceled' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600">
                                Canceled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
                            <span className="font-medium text-stone-900">{formatCurrency(sub.cost)} <span className="text-stone-500 font-normal">/ {sub.cycle === 'Monthly' ? 'mo' : 'yr'}</span></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(sub.renewalDate)}
                            </span>
                            {sub.status === 'Active' && sub.diffDays >= 0 && (
                              <>
                                <span>•</span>
                                <span className={sub.diffDays <= 3 ? 'text-orange-600 font-medium' : ''}>
                                  In {sub.diffDays} {sub.diffDays === 1 ? 'day' : 'days'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-4 sm:gap-6 pl-14 sm:pl-0">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={sub.autoCancel}
                              onChange={() => handleToggleAutoCancel(sub.id)}
                              disabled={sub.status === 'Canceled'}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${sub.autoCancel ? 'bg-emerald-500' : 'bg-stone-200'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${sub.autoCancel ? 'translate-x-4' : ''}`}></div>
                          </div>
                          <span className="text-sm font-medium text-stone-600 group-hover:text-stone-900 select-none">
                            Auto-Cancel
                          </span>
                        </label>
                        
                        <button 
                          onClick={() => handleDelete(sub.id)}
                          className="text-stone-400 hover:text-red-600 transition-colors p-2 -m-2 rounded-lg hover:bg-red-50"
                          aria-label="Delete subscription"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Subscription Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-semibold text-stone-900">Add Subscription</h2>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Service Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Netflix, Spotify"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Cost</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-stone-500 sm:text-sm">$</span>
                    </div>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                      value={cost}
                      onChange={e => setCost(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Billing Cycle</label>
                  <select 
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    value={cycle}
                    onChange={e => setCycle(e.target.value as BillingCycle)}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Renewal Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  value={renewalDate}
                  onChange={e => setRenewalDate(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                    checked={isFreeTrial}
                    onChange={e => setIsFreeTrial(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-stone-700">This is a Free Trial</span>
                </label>
              </div>

              {isFreeTrial && (
                <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-lg flex gap-2 items-start">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Auto-Cancel will be enabled by default to prevent unwanted charges.</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 px-4 py-2 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-stone-900 hover:bg-stone-800 rounded-lg font-medium transition-colors shadow-sm"
                >
                  Save Subscription
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
