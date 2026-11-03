import {describe,it,expect} from 'vitest';
import {minorUnits,decimal} from './lib';
import {dictionaries} from './i18n';
describe('money entry',()=>{it('preserves cents exactly',()=>{expect(minorUnits('0.29')).toBe(29);expect(minorUnits('123.4')).toBe(12340);expect(decimal(12340)).toBe('123.40')});it('rejects ambiguous or unsafe amounts',()=>{for(const v of ['-1','1.001','1e3','NaN','1,5','100000000000'])expect(()=>minorUnits(v)).toThrow()})});
it('all supported languages have every key',()=>{expect(Object.keys(dictionaries.ru).sort()).toEqual(Object.keys(dictionaries.en).sort());expect(Object.keys(dictionaries.tr).sort()).toEqual(Object.keys(dictionaries.en).sort())});
