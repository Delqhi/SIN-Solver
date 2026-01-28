import { IState, IStateMachine, IStateConfig } from './types';
import { randomUUID } from 'crypto';

/**
 * StateMachine class for managing system states and transitions.
 * Implements IStateMachine interface.
 */
export class StateMachine implements IStateMachine {
  public current: IState;
  public history: IState[] = [];
  public states: string[];
  public transitions: Record<string, string[]>;

  /**
   * Initializes the StateMachine with a configuration.
   * @param config The state machine configuration including initial state, valid states, and transitions.
   */
  constructor(config: IStateConfig) {
    this.states = config.states;
    this.transitions = config.transitions;
    
    // Initialize current state
    const timestamp = Date.now();
    this.current = {
      id: this.generateId(),
      name: config.initialState,
      timestamp,
      data: {}
    };

    // Log initial state to history
    this.history.push({ ...this.current });
  }

  /**
   * Directly sets the current state. Use with caution as it bypasses transition validation.
   * @param name The name of the state to set.
   * @param data Optional metadata associated with the state change.
   * @returns The newly created state object.
   */
  public async setState(name: string, data: Record<string, unknown> = {}): Promise<IState> {
    if (!this.states.includes(name)) {
      throw new Error(`Invalid state name: ${name}`);
    }

    const newState: IState = {
      id: this.generateId(),
      name,
      timestamp: Date.now(),
      data
    };

    this.current = newState;
    this.history.push({ ...newState });
    
    console.log(`[${new Date(newState.timestamp).toISOString()}] State Change: -> ${name}`, data);
    
    return newState;
  }

  /**
   * Transitions the machine to a new state if the transition is legal.
   * @param to The target state name.
   * @param metadata Optional metadata to include in the state change.
   * @returns True if the transition was successful.
   * @throws Error if the transition is illegal.
   */
  public async transition(to: string, metadata: Record<string, unknown> = {}): Promise<boolean> {
    const from = this.current.name;
    const allowedTransitions = this.transitions[from] || [];

    if (!allowedTransitions.includes(to)) {
      throw new Error(`Illegal transition: ${from} -> ${to}`);
    }

    await this.setState(to, metadata);
    return true;
  }

  /**
   * Returns the current state.
   * @returns The current IState object.
   */
  public getState(): IState {
    return { ...this.current };
  }

  /**
   * Returns the full history of state changes.
   * @returns An array of IState objects.
   */
  public getHistory(): IState[] {
    return [...this.history];
  }

  /**
   * Resets the state machine to its initial state (the first entry in history).
   * Clears the history except for the initial state.
   */
  public reset(): void {
    if (this.history.length > 0) {
      const initialState = this.history[0];
      this.current = { ...initialState, timestamp: Date.now(), id: this.generateId() };
      this.history = [{ ...this.current }];
    }
  }

  /**
   * Generates a unique ID for a state object.
   * @returns A unique string ID.
   */
  private generateId(): string {
    try {
      return randomUUID();
    } catch {
      // Fallback for environments without crypto.randomUUID
      return `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
}
