import type { WeekplanSupabase } from '../../services/supabaseClient';
import type { PlannerStore } from './state';
import type { PlannerItem } from '../../types/planner';

async function ensurePlan(client: WeekplanSupabase): Promise<string | null> {
  const { data: plans, error } = await client
    .from('plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Failed to fetch plans', error);
    return null;
  }

  if (plans && plans.length > 0) {
    return plans[0].id as string;
  }

  const { data: userData } = await client.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    return null;
  }

  const { data, error: insertError } = await client
    .from('plans')
    .insert({ user_id: userId, title: 'My Week Plan' })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create plan', insertError);
    return null;
  }

  return data?.id as string;
}

export async function loadPlan(client: WeekplanSupabase, store: PlannerStore): Promise<void> {
  const planId = await ensurePlan(client);
  if (!planId) {
    return;
  }

  const { data: items, error } = await client
    .from('plan_items')
    .select('dow, title, image_url, color')
    .eq('plan_id', planId);

  if (error) {
    console.error('Failed to fetch plan items', error);
    return;
  }

  const normalized: PlannerItem[] = (items ?? []).map((entry) => ({
    dow: Number(entry.dow),
    title: entry.title ?? '(empty)',
    imageUrl: entry.image_url ?? '',
    color: entry.color ?? undefined,
  }));

  store.load({ planId, items: normalized });
}

export async function savePlan(client: WeekplanSupabase, store: PlannerStore): Promise<boolean> {
  const planId = store.getPlanId();
  if (!planId) {
    return false;
  }

  const snapshot = store.snapshot();
  await client.from('plan_items').delete().eq('plan_id', planId);
  if (snapshot.items.length === 0) {
    return true;
  }

  const rows = snapshot.items.map((item) => ({
    plan_id: planId,
    dow: item.dow,
    title: item.title,
    image_url: item.imageUrl,
    color: item.color ?? null,
  }));

  const { error } = await client.from('plan_items').insert(rows);
  if (error) {
    console.error('Failed to save plan items', error);
    return false;
  }
  return true;
}
