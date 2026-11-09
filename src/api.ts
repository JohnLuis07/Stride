import { supabase } from './supabaseClient';
export async function invoke(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error.name === 'FunctionsFetchError') {
      if (!navigator.onLine) throw new Error('You appear to be offline. Reconnect and try again.');
      if (name === 'notes-ai')
        throw new Error(
          `Notes AI could not connect. Ask your workspace administrator to allow ${window.location.origin} in the Notes AI service and deploy its latest browser support update, then try again.`,
        );
      throw new Error('The service could not be reached. Please try again.');
    }
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        const value = await error.context.json();
        message = value.error || message;
      } catch {
        /* Keep transport error. */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export { localDate } from './dates';
