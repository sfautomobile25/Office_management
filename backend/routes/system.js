const express = require('express');
const router = express.Router();
const db = require('../database');
const { allAsync, runAsync } = require("../database");

// Public endpoints for system status
router.get('/status', async (req, res) => {
    try {
        const dbStatus = await db.getAsync('SELECT 1 as ok');
        
        // Get some basic stats
        const userCount = await db.getAsync('SELECT COUNT(*) as count FROM users');
        const contentCount = await db.getAsync('SELECT COUNT(*) as count FROM website_content');
        
        res.json({
            status: 'online',
            database: dbStatus ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
            stats: {
                users: userCount.count,
                contentPages: contentCount.count
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

// Currency conversion (public endpoint)
router.get('/convert-currency', async (req, res) => {
    const { from = 'USD', to, amount = 1 } = req.query;
    
    if (!to) {
        return res.status(400).json({ error: 'Target currency (to) is required' });
    }
    
    if (from === to) {
        return res.json({ 
            from, 
            to, 
            amount: parseFloat(amount), 
            converted: parseFloat(amount), 
            rate: 1 
        });
    }
    
    try {
        // Try direct rate
        let rate = await db.getAsync(
            'SELECT rate FROM currency_rates WHERE base_currency = ? AND target_currency = ?',
            [from.toUpperCase(), to.toUpperCase()]
        );
        
        if (rate) {
            const converted = parseFloat(amount) * rate.rate;
            return res.json({ 
                from, 
                to, 
                amount: parseFloat(amount), 
                converted: parseFloat(converted.toFixed(2)), 
                rate: rate.rate,
                source: 'database'
            });
        }
        
        // Try inverse rate
        rate = await db.getAsync(
            'SELECT rate FROM currency_rates WHERE base_currency = ? AND target_currency = ?',
            [to.toUpperCase(), from.toUpperCase()]
        );
        
        if (rate) {
            const converted = parseFloat(amount) / rate.rate;
            return res.json({ 
                from, 
                to, 
                amount: parseFloat(amount), 
                converted: parseFloat(converted.toFixed(2)), 
                rate: 1 / rate.rate,
                source: 'database (inverse)'
            });
        }
        
        // Fallback to mock rates
        const mockRates = {
            'USD-EUR': 0.85,
            'USD-GBP': 0.73,
            'USD-JPY': 110.50,
            'USD-CAD': 1.32,
            'USD-AUD': 1.48,
            'EUR-USD': 1.18,
            'EUR-GBP': 0.86,
            'GBP-USD': 1.37,
            'GBP-EUR': 1.16
        };
        
        const key = `${from.toUpperCase()}-${to.toUpperCase()}`;
        const mockRate = mockRates[key];
        
        if (mockRate) {
            const converted = parseFloat(amount) * mockRate;
            return res.json({ 
                from, 
                to, 
                amount: parseFloat(amount), 
                converted: parseFloat(converted.toFixed(2)), 
                rate: mockRate,
                source: 'mock data',
                note: 'Using fallback conversion rate'
            });
        }
        
        // No rate found
        res.status(404).json({ 
            error: `Conversion rate from ${from} to ${to} not available` 
        });
        
    } catch (error) {
        console.error('Currency conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get available currencies
router.get('/currencies', async (req, res) => {
    try {
        const currencies = await db.allAsync(
            'SELECT DISTINCT base_currency as currency FROM currency_rates UNION SELECT DISTINCT target_currency FROM currency_rates'
        );
        
        // Extract unique currencies
        const uniqueCurrencies = [...new Set(currencies.map(c => c.currency))].sort();
        
        res.json({
            currencies: uniqueCurrencies,
            count: uniqueCurrencies.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get public content (for frontend display)
router.get('/content/:page', async (req, res) => {
    const { page } = req.params;
    const { language = 'en' } = req.query;
    
    try {
        const content = await db.getAsync(
            'SELECT page_name, content, seo_title, seo_description FROM website_content WHERE page_name = ? AND language = ?',
            [page, language]
        );
        
        if (!content) {
            // Try English as fallback
            const fallbackContent = await db.getAsync(
                'SELECT page_name, content, seo_title, seo_description FROM website_content WHERE page_name = ? AND language = "en"',
                [page]
            );
            
            if (!fallbackContent) {
                return res.status(404).json({ error: 'Content not found' });
            }
            
            res.json({
                ...fallbackContent,
                language: 'en',
                note: 'Using English as fallback'
            });
            return;
        }
        
        res.json({
            ...content,
            language
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get SEO settings for frontend
router.get('/seo', async (req, res) => {
    try {
        const seo = await db.getAsync('SELECT * FROM seo_settings LIMIT 1');
        
        if (!seo) {
            return res.json({
                meta_title: 'Real Estate Management',
                meta_description: 'Professional Real Estate Management System',
                meta_keywords: 'real estate, property management'
            });
        }
        
        res.json(seo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/staff", async (req, res) => {
  try {
    const staff = await allAsync(
      `SELECT id, username AS name
       FROM users
       WHERE role IN ('admin','staff')
       ORDER BY username`
    );
    res.json({ staff });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load staff" });
  }
});


module.exports = router;