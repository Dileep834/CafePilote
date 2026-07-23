import { Link } from 'react-router-dom';
import { CreditCard, Plus, Check } from 'lucide-react';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { PLAN_LIMITS, type SubscriptionPlanId } from '@/lib/planLimits';

const ORDER: SubscriptionPlanId[] = ['lite', 'starter', 'professional', 'enterprise'];

export function SubscriptionPlansPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Subscription plans</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Assign a plan during Create Company. Limits come from planLimits.
          </p>
        </div>
        <Link
          to="/erp/super-admin/create-company"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
        >
          <Plus className="h-4 w-4" />
          Create company with a plan
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {ORDER.map((id) => {
          const plan = PLAN_LIMITS[id];
          return (
            <InventoryCard
              key={id}
              label={plan.label || id}
              value={plan.maxUsers == null ? '∞ users' : `${plan.maxUsers} users`}
              subtitle={
                plan.maxOutlets >= 999 ? 'Unlimited outlets' : `${plan.maxOutlets} outlet(s)`
              }
              icon={CreditCard}
              tone={id === 'enterprise' ? 'orange' : id === 'professional' ? 'blue' : 'slate'}
            />
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ORDER.map((id) => {
          const plan = PLAN_LIMITS[id];
          return (
            <article
              key={id}
              className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{plan.label || id}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Outlets: {plan.maxOutlets >= 999 ? 'Unlimited' : plan.maxOutlets} · Users:{' '}
                    {plan.maxUsers == null ? 'Unlimited' : plan.maxUsers}
                  </p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-slate-600">
                  {id}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5">
                {plan.modules.slice(0, 10).map((mod) => (
                  <li key={mod} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#FF6A00]" />
                    {mod}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default SubscriptionPlansPage;
