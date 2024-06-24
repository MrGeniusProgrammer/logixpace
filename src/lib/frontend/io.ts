import { CanvasStyle } from '$lib/helpers/canvas-style';
import { BoxCollider, Collider, LineCollider, PointCollider } from '$lib/helpers/colliders';
import { Color, HSL, RGB } from '$lib/helpers/color';
import { drawLine, drawRectangle } from '$lib/helpers/draw';
import { calculateBoxFromTwoPoint } from '$lib/helpers/shape';
import { Vector2D } from '$lib/helpers/vector2d';
import { DEFUALTS, EVENT_IDS } from './defaults';
import { DIRECTION, getDirectionVector, type Direction } from '../helpers/direction';
import type { NamedPin } from './named-pin';
import { Pin, type PinProps } from './pin';
import { SimulationEventDispatcher, SimulationEventListener } from './simulation-event';
import type { Wire } from './wire';

export interface IOProps extends PinProps {
	color?: Color;
}

export class IO {
	collider: BoxCollider;
	bound: BoxCollider;

	outletLineCollider: LineCollider;
	outletCollider: BoxCollider;

	namedPin: NamedPin;

	position: Vector2D;
	outletPosition: Vector2D = new Vector2D();
	direction: Direction;

	dispatcher = new SimulationEventDispatcher();

	wires: Wire[] = [];

	isSelected = false;
	isHovering = false;
	isOutletLineHovering = false;
	isOutletHovering = false;

	color: Color;

	constructor({ namedPin, position, direction, color = new RGB(0, 0, 0) }: IOProps) {
		this.namedPin = namedPin;
		this.position = position.clone();

		this.color = color;

		this.direction = direction;

		this.calculateOutletPosition();

		this.outletLineCollider = new LineCollider(
			this.position,
			this.outletPosition,
			DEFUALTS.PIN_OUTLET_LINE_WIDTH
		);

		this.outletCollider = new BoxCollider(
			this.getOutletTopLeftPosition(),
			DEFUALTS.PIN_OUTLET_SIZE,
			DEFUALTS.PIN_OUTLET_SIZE
		);

		this.collider = new BoxCollider(this.getTopLeftPosition(), DEFUALTS.IO_SIZE, DEFUALTS.IO_SIZE);

		const result = this.calculateBound();
		this.bound = new BoxCollider(result.position, result.width, result.height);

		this.initEvents();
	}

	initEvents() {
		this.dispatcher.addEmiiter(EVENT_IDS.onMove);
	}

	addWire(wire: Wire) {
		this.wires.push(wire);
	}

	updateColliders() {
		this.calculateOutletPosition();
		this.outletCollider.position.copy(this.getOutletTopLeftPosition());

		this.outletLineCollider.startPosition.copy(this.getOutletLinePosition());
		this.outletLineCollider.endPosition.copy(this.outletPosition);

		const result = this.calculateBound();
		this.bound.position.copy(result.position);

		this.collider.position.copy(this.getTopLeftPosition());
	}

	getOutletLinePosition() {
		return this.position.clone().subScalar(DEFUALTS.PIN_OUTLET_LINE_WIDTH / 2);
	}

	getOutletTopLeftPosition() {
		return this.outletPosition.clone().subScalar(DEFUALTS.PIN_OUTLET_SIZE / 2);
	}

	getTopLeftPosition() {
		return this.position.clone().subScalar(DEFUALTS.IO_SIZE / 2);
	}

	calculateOutletPosition() {
		this.outletPosition
			.copy(this.position)
			.addVector(
				getDirectionVector(this.direction).multScalar(
					DEFUALTS.PIN_OUTLET_LINE_LENGTH + DEFUALTS.IO_SIZE / 2 + DEFUALTS.PIN_OUTLET_SIZE / 2
				)
			);
	}

	calculateBound() {
		const dir = this.direction;

		const dirVector = getDirectionVector(dir);
		const end = this.position
			.clone()
			.addVector(
				dirVector
					.clone()
					.multScalar(
						DEFUALTS.PIN_OUTLET_LINE_LENGTH + DEFUALTS.PIN_OUTLET_SIZE + DEFUALTS.IO_SIZE / 2
					)
			);
		const start = this.position.clone().addVector(dirVector.multScalar(-DEFUALTS.IO_SIZE / 2));

		switch (dir) {
			case DIRECTION.RIGHT:
			case DIRECTION.LEFT: {
				end.y += DEFUALTS.IO_SIZE / 2;
				start.y -= DEFUALTS.IO_SIZE / 2;
				return calculateBoxFromTwoPoint(start, end);
			}

			case DIRECTION.TOP:
			case DIRECTION.BOTTOM: {
				end.x += DEFUALTS.IO_SIZE / 2;
				start.x -= DEFUALTS.IO_SIZE / 2;
				return calculateBoxFromTwoPoint(start, end);
			}
		}
	}

	isCollidingOutlet(collider: Collider) {
		return this.outletCollider.isColliding(collider);
	}

	isCollidingOutletLine(collider: Collider) {
		return this.outletLineCollider.isColliding(collider);
	}

	isCollidingMain(collider: Collider) {
		return this.collider.isColliding(collider);
	}

	move(delta: Vector2D) {
		this.position.addVector(delta);
		this.updateColliders();

		this.dispatcher.dispatch(EVENT_IDS.onMove, delta);
		this.dispatcher.dispatch(EVENT_IDS.onOutletMove, this.outletPosition);
	}

	checkHover(pointCollider: PointCollider) {
		this.resetHover();

		if (this.isCollidingOutlet(pointCollider)) {
			this.isOutletHovering = true;
			return true;
		} else if (this.isCollidingMain(pointCollider)) {
			this.isHovering = true;
			return true;
		} else if (this.isCollidingOutletLine(pointCollider)) {
			this.isOutletLineHovering = true;
			return true;
		}

		return false;
	}

	resetHover() {
		this.isOutletHovering = false;
		this.isOutletLineHovering = false;
		this.isHovering = false;
	}

	select(pointCollider: PointCollider) {
		if (
			this.isCollidingMain(pointCollider) ||
			this.isCollidingOutlet(pointCollider) ||
			this.isCollidingOutletLine(pointCollider)
		) {
			this.isSelected = true;
		}
	}

	deselect() {
		this.isSelected = false;
	}

	draw(ctx: CanvasRenderingContext2D, currTime: number, deltaTime: number) {
		drawLine(
			ctx,
			this.position.x,
			this.position.y,
			this.outletPosition.x,
			this.outletPosition.y,
			new CanvasStyle({
				lineWidth: DEFUALTS.PIN_OUTLET_LINE_WIDTH,
				strokeColor: this.color
			})
		);

		drawRectangle(
			ctx,
			this.outletCollider.position.x,
			this.outletCollider.position.y,
			DEFUALTS.PIN_OUTLET_SIZE,
			DEFUALTS.PIN_OUTLET_SIZE,
			new CanvasStyle({
				fillColor: this.color
			})
		);

		drawRectangle(
			ctx,
			this.collider.position.x,
			this.collider.position.y,
			DEFUALTS.IO_SIZE,
			DEFUALTS.IO_SIZE,
			new CanvasStyle({
				fillColor: this.color
			})
		);
	}
}
