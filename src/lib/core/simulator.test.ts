import { describe } from 'vitest';
import { expect } from 'vitest';
import { test } from 'vitest';
import { circuits, type ReturnExample } from '../examples';

function testExample(example: ReturnExample) {
	example.init();
	example.run();
	expect(example.pins.map((v) => v.powerState)).toStrictEqual(example.expectPowerStates);
}

describe('simulator', () => {
	describe('should circuit output correclty', () => {
		for (let i = 0; i < circuits.length; i++) {
			const circuit = circuits[i];
			const returns = circuit();
			test(`for ${circuit.name}`, () => {
				testExample(returns);
			});
		}
	});
});
