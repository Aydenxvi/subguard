export function minorUnits(value:string):number {
 if(!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Use an amount with up to two decimal places');
 const [a,b='']=value.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n>10**12)throw new Error('Amount is too large');return n;
}
export function decimal(n:number):string{return `${Math.floor(n/100)}.${String(n%100).padStart(2,'0')}`;}
export const currencies=['USD','EUR','TRY','GBP','KGS'];
export const intervals=['weekly','monthly','quarterly','semiannual','annual','custom_days'];
export const statuses=['active','trial','paused','cancelled','archived'];
export type Sub={id:number;name:string;provider:string|null;amount_minor:number;currency:string;interval:string;interval_days:number|null;anchor_date:string;next_billing_date:string;status:string;is_trial:boolean;trial_end_date:string|null;cancel_before_date:string|null;cancellation_url:string|null;notes:string|null;payment_method_label:string|null;days_until_billing:number;monthly_equivalent_minor:number};
export type Prefs={locale:'en'|'ru'|'tr';timezone:string;primary_currency:string;reminder_days_before:number;trial_reminder_days_before:number;quiet_hours_start:number;quiet_hours_end:number;notifications_enabled:boolean};
export type User={id:number;first_name:string;is_demo:boolean;settings:Prefs};
export type Refund={id:number;title:string;amount_minor:number;currency:string;status:string;reason:string;charged_on:string;next_follow_up_on:string|null};
export type Total={currency:string;amount_minor:number};
export type Payment={id:number;subscription_id:number;amount_minor:number;currency:string;charged_on:string};
export type Analytics={active_count:number;trial_count:number;monthly_totals:Total[];annual_totals:Total[];upcoming:Sub[];recorded_totals:Total[];payments:Payment[];by_subscription:(Total&{name:string})[]};
