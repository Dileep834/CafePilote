import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_DRAFT,
  ONBOARDING_STEPS,
  type MenuItemDraft,
  type OnboardingDraft,
  type OnboardingProgress,
} from '../types';
import { CompanyProvisioningService, parseMenuTextToItems } from '../services/companyProvisioningService';

type WizardState = {
  draft: OnboardingDraft;
  busy: boolean;
  error: string | null;
  message: string | null;
  setStep: (index: number) => void;
  next: () => void;
  back: () => void;
  patchDraft: (partial: Partial<OnboardingDraft>) => void;
  patchBusiness: (partial: OnboardingDraft['business']) => void;
  patchProgress: (partial: Partial<OnboardingProgress>) => void;
  reset: () => void;
  autosave: (userId?: string | null) => Promise<void>;
  provision: (userId?: string | null) => Promise<void>;
  runCreateTables: () => Promise<void>;
  runImportMenu: () => Promise<void>;
  applyAiMenuText: (text: string) => void;
  setMenuItems: (items: MenuItemDraft[]) => void;
  goLive: () => Promise<string | null>;
};

export const useOnboardingWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      draft: { ...DEFAULT_DRAFT, business: { ...DEFAULT_DRAFT.business }, progress: { ...DEFAULT_DRAFT.progress } },
      busy: false,
      error: null,
      message: null,

      setStep: (index) =>
        set((s) => ({
          draft: {
            ...s.draft,
            stepIndex: Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, index)),
          },
        })),

      next: () => get().setStep(get().draft.stepIndex + 1),
      back: () => get().setStep(get().draft.stepIndex - 1),

      patchDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),

      patchBusiness: (partial) =>
        set((s) => ({ draft: { ...s.draft, business: { ...s.draft.business, ...partial } } })),

      patchProgress: (partial) =>
        set((s) => ({
          draft: { ...s.draft, progress: { ...s.draft.progress, ...partial } },
        })),

      reset: () =>
        set({
          draft: {
            ...DEFAULT_DRAFT,
            business: { ...DEFAULT_DRAFT.business },
            progress: { ...DEFAULT_DRAFT.progress },
            menuItems: [],
            staff: [],
          },
          error: null,
          message: null,
          busy: false,
        }),

      autosave: async (userId) => {
        const draft = get().draft;
        try {
          const id = await CompanyProvisioningService.autosaveDraft(draft, userId);
          if (id && id !== draft.draftId) {
            set((s) => ({ draft: { ...s.draft, draftId: id } }));
          }
        } catch {
          /* local fallback inside service */
        }
      },

      provision: async (userId) => {
        set({ busy: true, error: null, message: null });
        try {
          const result = await CompanyProvisioningService.provision(get().draft.business, userId);
          set((s) => ({
            draft: {
              ...s.draft,
              provisionResult: result,
              progress: {
                ...s.draft.progress,
                companyCreated: true,
                taxesConfigured: true,
              },
            },
            message: `Company ${result.companyCode} provisioned`,
            busy: false,
          }));
          await get().autosave(userId);
          get().next();
        } catch (e) {
          set({
            busy: false,
            error: e instanceof Error ? e.message : 'Provisioning failed',
          });
        }
      },

      runCreateTables: async () => {
        set({ busy: true, error: null });
        try {
          const count = await CompanyProvisioningService.createTables(get().draft);
          set((s) => ({
            busy: false,
            message: `Created ${count} tables`,
            draft: {
              ...s.draft,
              progress: { ...s.draft.progress, tablesCreated: true },
            },
          }));
        } catch (e) {
          set({ busy: false, error: e instanceof Error ? e.message : 'Table creation failed' });
        }
      },

      runImportMenu: async () => {
        set({ busy: true, error: null });
        try {
          const count = await CompanyProvisioningService.importApprovedMenu(get().draft);
          set((s) => ({
            busy: false,
            message: `Imported ${count} menu items`,
            draft: {
              ...s.draft,
              progress: { ...s.draft.progress, menuImported: count > 0 },
            },
          }));
        } catch (e) {
          set({ busy: false, error: e instanceof Error ? e.message : 'Menu import failed' });
        }
      },

      applyAiMenuText: (text) => {
        const items = parseMenuTextToItems(text);
        set((s) => ({
          draft: { ...s.draft, menuMode: 'ai_scan', menuItems: items },
          message: items.length ? `Extracted ${items.length} items — review before import` : 'No items found',
        }));
      },

      setMenuItems: (items) => set((s) => ({ draft: { ...s.draft, menuItems: items } })),

      goLive: async () => {
        const { draft } = get();
        if (!draft.provisionResult?.companyId) {
          set({ error: 'Provision a company first' });
          return null;
        }
        set({ busy: true, error: null });
        try {
          const progress: OnboardingProgress = {
            ...draft.progress,
            companyCreated: true,
            live: true,
            paymentSetup: draft.progress.paymentSetup || draft.payments.cash,
            printerConnected: draft.progress.printerConnected || draft.printersSkipped,
          };
          await CompanyProvisioningService.markProgress(
            draft.provisionResult.companyId,
            progress,
            true
          );
          set((s) => ({
            busy: false,
            draft: { ...s.draft, progress },
            message: 'Company is live — opening POS',
          }));
          return draft.provisionResult.outletId;
        } catch (e) {
          set({ busy: false, error: e instanceof Error ? e.message : 'Go-live failed' });
          return null;
        }
      },
    }),
    { name: 'cafepilots-superadmin-onboarding-wizard' }
  )
);
