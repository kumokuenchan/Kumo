import { Router } from 'express';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { TerminalService } from '../services/TerminalService.js';

const router = Router();
const terminalService = new TerminalService();

// POST execute command
router.post('/execute', async (req, res) => {
  try {
    const { command, connectionId } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Execute the command
    const result = await terminalService.executeCommand(command, connectionId);
    
    res.json({
      success: true,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to execute command',
      message: error.message
    });
  }
});

// POST start interactive terminal session
router.post('/session', async (req, res) => {
  try {
    const { connectionId } = req.body;

    // Create a new terminal session
    const sessionId = uuidv4();
    const session = terminalService.createSession(sessionId, connectionId);

    res.json({ 
      sessionId,
      message: 'Terminal session created successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to create terminal session', 
      message: error.message 
    });
  }
});

// POST send command to session
router.post('/session/:sessionId/send', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const output = await terminalService.sendCommandToSession(sessionId, command);

    res.json({ 
      success: true, 
      output
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to send command to session', 
      message: error.message 
    });
  }
});

// GET session info
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = terminalService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ 
      sessionId,
      isActive: session.isActive,
      lastActivity: session.lastActivity
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to get session info', 
      message: error.message 
    });
  }
});

// DELETE session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    terminalService.closeSession(sessionId);

    res.json({ message: 'Session closed successfully' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to close session',
      message: error.message
    });
  }
});

// POST get autocomplete suggestions
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { partial } = req.body;

    if (partial === undefined) {
      return res.status(400).json({ error: 'Partial command is required' });
    }

    const completions = await terminalService.getCompletions(sessionId, partial);

    res.json({
      completions
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get completions',
      message: error.message
    });
  }
});

export default router;