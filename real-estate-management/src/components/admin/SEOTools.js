import React, { useState } from 'react';

function SEOTools() {
    const [seoSettings, setSeoSettings] = useState({
        metaTitle: 'Real Estate Management',
        metaDescription: 'Professional real estate management services',
        metaKeywords: 'real estate, property, management, homes',
        googleAnalyticsId: 'UA-XXXXX-Y',
        robotsTxt: 'User-agent: *\nAllow: /',
        sitemapUrl: '/sitemap.xml'
    });

    const [pageAnalysis, setPageAnalysis] = useState({
        url: '',
        score: 0,
        issues: []
    });

    const [keyword, setKeyword] = useState('');
    const [keywordResults, setKeywordResults] = useState([]);

    const analyzePage = () => {
        if (!pageAnalysis.url) return;
        
        // Mock analysis
        const mockIssues = [
            { type: 'warning', message: 'Meta description is too short' },
            { type: 'error', message: 'Missing alt tags on images' },
            { type: 'success', message: 'Page title is optimized' },
            { type: 'warning', message: 'Could use more internal links' }
        ];
        
        setPageAnalysis({
            ...pageAnalysis,
            score: 78,
            issues: mockIssues
        });
    };

    const analyzeKeyword = () => {
        if (!keyword.trim()) return;
        
        // Mock keyword analysis
        const mockResults = [
            { position: 1, keyword: `${keyword} for sale`, volume: 2400, difficulty: 45 },
            { position: 2, keyword: `buy ${keyword}`, volume: 1800, difficulty: 52 },
            { position: 3, keyword: `${keyword} properties`, volume: 1200, difficulty: 38 },
            { position: 4, keyword: `${keyword} real estate`, volume: 900, difficulty: 41 }
        ];
        
        setKeywordResults(mockResults);
    };

    const generateSitemap = () => {
        alert('Sitemap generated and submitted to search engines!');
    };

    const submitToSearchEngines = () => {
        alert('URL submitted to Google and Bing!');
    };

    return (
        <div className="seo-tools">
            <div className="page-header">
                <h2>SEO Tools</h2>
                <div className="header-actions">
                    <button className="btn-primary" onClick={generateSitemap}>
                        Generate Sitemap
                    </button>
                    <button className="btn-secondary" onClick={submitToSearchEngines}>
                        Submit to Search Engines
                    </button>
                </div>
            </div>

            <div className="seo-sections">
                <div className="seo-section">
                    <h3>Global SEO Settings</h3>
                    <div className="settings-form">
                        <div className="form-group">
                            <label>Site Title</label>
                            <input
                                type="text"
                                value={seoSettings.metaTitle}
                                onChange={(e) => setSeoSettings({...seoSettings, metaTitle: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Meta Description</label>
                            <textarea
                                value={seoSettings.metaDescription}
                                onChange={(e) => setSeoSettings({...seoSettings, metaDescription: e.target.value})}
                                rows={3}
                            />
                            <div className="char-count">
                                {seoSettings.metaDescription.length}/160 characters
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Meta Keywords</label>
                            <input
                                type="text"
                                value={seoSettings.metaKeywords}
                                onChange={(e) => setSeoSettings({...seoSettings, metaKeywords: e.target.value})}
                            />
                        </div>
                        <div className="form-group">
                            <label>Google Analytics ID</label>
                            <input
                                type="text"
                                value={seoSettings.googleAnalyticsId}
                                onChange={(e) => setSeoSettings({...seoSettings, googleAnalyticsId: e.target.value})}
                                placeholder="UA-XXXXX-Y"
                            />
                        </div>
                        <div className="form-group">
                            <label>Robots.txt</label>
                            <textarea
                                value={seoSettings.robotsTxt}
                                onChange={(e) => setSeoSettings({...seoSettings, robotsTxt: e.target.value})}
                                rows={4}
                            />
                        </div>
                        <button className="btn-primary">Save SEO Settings</button>
                    </div>
                </div>

                <div className="seo-section">
                    <h3>Page Analysis</h3>
                    <div className="analysis-tool">
                        <div className="url-input">
                            <input
                                type="text"
                                value={pageAnalysis.url}
                                onChange={(e) => setPageAnalysis({...pageAnalysis, url: e.target.value})}
                                placeholder="Enter page URL to analyze"
                            />
                            <button className="btn-primary" onClick={analyzePage}>
                                Analyze
                            </button>
                        </div>
                        
                        {pageAnalysis.score > 0 && (
                            <div className="analysis-results">
                                <div className="seo-score">
                                    <div className="score-circle">
                                        <span>{pageAnalysis.score}</span>
                                    </div>
                                    <div className="score-label">SEO Score</div>
                                </div>
                                
                                <div className="issues-list">
                                    <h4>Issues Found:</h4>
                                    {pageAnalysis.issues.map((issue, index) => (
                                        <div key={index} className={`issue ${issue.type}`}>
                                            <span className="issue-type">{issue.type.toUpperCase()}</span>
                                            <span className="issue-message">{issue.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="seo-section">
                    <h3>Keyword Research</h3>
                    <div className="keyword-tool">
                        <div className="keyword-input">
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Enter a keyword to research"
                            />
                            <button className="btn-primary" onClick={analyzeKeyword}>
                                Research
                            </button>
                        </div>
                        
                        {keywordResults.length > 0 && (
                            <div className="keyword-results">
                                <h4>Related Keywords:</h4>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Keyword</th>
                                            <th>Search Volume</th>
                                            <th>Difficulty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {keywordResults.map((result, index) => (
                                            <tr key={index}>
                                                <td>{result.keyword}</td>
                                                <td>{result.volume.toLocaleString()}/month</td>
                                                <td>
                                                    <div className="difficulty-bar">
                                                        <div 
                                                            className="difficulty-fill"
                                                            style={{ width: `${result.difficulty}%` }}
                                                        />
                                                        <span>{result.difficulty}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="seo-reports">
                <h3>SEO Reports</h3>
                <div className="reports-grid">
                    <div className="report-card">
                        <h4>Backlink Analysis</h4>
                        <p>Analyze your backlink profile</p>
                        <button className="btn-secondary">Generate Report</button>
                    </div>
                    <div className="report-card">
                        <h4>Competitor Analysis</h4>
                        <p>Compare with competitors</p>
                        <button className="btn-secondary">Analyze Competitors</button>
                    </div>
                    <div className="report-card">
                        <h4>Rank Tracker</h4>
                        <p>Track keyword rankings</p>
                        <button className="btn-secondary">View Rankings</button>
                    </div>
                    <div className="report-card">
                        <h4>Site Health</h4>
                        <p>Check for technical issues</p>
                        <button className="btn-secondary">Run Health Check</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SEOTools;