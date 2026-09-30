// A React "context" lets any screen reach the game state without passing it
// down through every component by hand. App.jsx provides it; screens call useGame().
import { createContext, useContext } from 'react';

export const GameContext = createContext(null);

// Gives: { save, game, today, actions, openAppForm, goto, toast }
export const useGame = () => useContext(GameContext);
