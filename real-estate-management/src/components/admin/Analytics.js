import React, { useState, useEffect } from 'react';

function Analytics() {
    const [timeRange, setTimeRange] = useState('7d');
    const [analyticsData, setAnalyticsData] = useState({
        visitors: 0,
        pageviews: 0,
        bounceRate: 0,
        avgSession: 0
    });
    const [chartData, setChartData] = useState([]);
    const [topPages, setTopPages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalyticsData();
    }, [timeRange]);

    const fetchAnalyticsData = () => {
        setLoading(true);
        
        // Mock data based on time range
        let mockData;
        switch(timeRange) {
            case '1d':
                mockData = { visitors: 1245, pageviews: 5432, bounceRate: 42, avgSession: '3:45' };
                break;
            case '7d':
                mockData = { visitors: 8567, pageviews: 32456, bounceRate: 38, avgSession: '4:12' };
                break;
            case '30d':
                mockData = { visitors: 34567, pageviews: 145678, bounceRate: 35, avgSession: '4:30' };
                break;
            default:
                mockData = { visitors: 8567, pageviews: 32456, bounceRate: 38, avgSession: '4:12' };
        }

        // Mock chart data
        const mockChartData = Array.from({ length: 7 }, (_, i) => ({
            date: `Day ${i + 1}`,
            visitors: Math.floor(Math.random() * 1000) + 500,
            pageviews: Math.floor(Math.random() * 4000) + 2000
        }));

        // Mock top pages
        const mockTopPages = [
            { page: '/', visits: 1234, unique: 987 },
            { page: '/properties', visits: 876, unique: 654 },
            { page: '/about', visits: 543, unique: 432 },
            { page: '/contact', visits: 321, unique: 210 },
            { page: '/login', visits: 210, unique: 198 }
        ];

        setTimeout(() => {
            setAnalyticsData(mockData);
            setChartData(mockChartData);
            setTopPages(mockTopPages);
            setLoading(false);
        }, 1000);
    };

    const exportReport = () => {
        alert('Analytics report exported!');
    };

    const integrateGoogleAnalytics = () => {
        const gaId = prompt('Enter your Google Analytics ID (e.g., UA-XXXXX-Y):');
        if (gaId) {
            alert(`Google Analytics integrated with ID: ${gaId}`);
        }
    };

    return (
        <div className="analytics">
            <div className="page-header">
                <h2>Analytics Dashboard</h2>
                <div className="header-actions">
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="time-selector"
                    >
                        <option value="1d">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <button className="btn-secondary" onClick={exportReport}>
                        Export Report
                    </button>
                    <button className="btn-primary" onClick={integrateGoogleAnalytics}>
                        Connect Google Analytics
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading analytics data...</div>
            ) : (
                <>
                    <div className="analytics-stats">
                        <div className="stat-card">
                            <h3>Total Visitors</h3>
                            <div className="stat-value">{analyticsData.visitors.toLocaleString()}</div>
                            <p>Unique visitors</p>
                        </div>
                        <div className="stat-card">
                            <h3>Page Views</h3>
                            <div className="stat-value">{analyticsData.pageviews.toLocaleString()}</div>
                            <p>Total page views</p>
                        </div>
                        <div className="stat-card">
                            <h3>Bounce Rate</h3>
                            <div className="stat-value">{analyticsData.bounceRate}%</div>
                            <p>Lower is better</p>
                        </div>
                        <div className="stat-card">
                            <h3>Avg Session</h3>
                            <div className="stat-value">{analyticsData.avgSession}</div>
                            <p>Average session duration</p>
                        </div>
                    </div>

                    <div className="analytics-charts">
                        <div className="chart-section">
                            <h3>Traffic Overview</h3>
                            <div className="chart-container">
                                <div className="chart">
                                    {chartData.map((day, index) => (
                                        <div key={index} className="chart-bar">
                                            <div 
                                                className="bar visitors"
                                                style={{ height: `${(day.visitors / 1500) * 100}%` }}
                                                title={`Visitors: ${day.visitors}`}
                                            />
                                            <div 
                                                className="bar pageviews"
                                                style={{ height: `${(day.pageviews / 6000) * 100}%` }}
                                                title={`Pageviews: ${day.pageviews}`}
                                            />
                                            <div className="chart-label">{day.date}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-legend">
                                    <div className="legend-item">
                                        <span className="color visitors"></span>
                                        <span>Visitors</span>
                                    </div>
                                    <div className="legend-item">
                                        <span className="color pageviews"></span>
                                        <span>Pageviews</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-tables">
                        <div className="table-section">
                            <h3>Top Pages</h3>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Page</th>
                                            <th>Visits</th>
                                            <th>Unique Visitors</th>
                                            <th>% of Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topPages.map((page, index) => (
                                            <tr key={index}>
                                                <td>{page.page}</td>
                                                <td>{page.visits.toLocaleString()}</td>
                                                <td>{page.unique.toLocaleString()}</td>
                                                <td>
                                                    <div className="percentage-bar">
                                                        <div 
                                                            className="percentage-fill"
                                                            style={{ width: `${(page.visits / topPages[0].visits) * 100}%` }}
                                                        />
                                                        <span>{((page.visits / analyticsData.visitors) * 100).toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="table-section">
                            <h3>Traffic Sources</h3>
                            <div className="sources-list">
                                <div className="source-item">
                                    <div className="source-name">Direct</div>
                                    <div className="source-stats">
                                        <span>45%</span>
                                        <div className="source-bar" style={{ width: '45%' }}></div>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-name">Organic Search</div>
                                    <div className="source-stats">
                                        <span>30%</span>
                                        <div className="source-bar" style={{ width: '30%' }}></div>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-name">Social Media</div>
                                    <div className="source-stats">
                                        <span>15%</span>
                                        <div className="source-bar" style={{ width: '15%' }}></div>
                                    </div>
                                </div>
                                <div className="source-item">
                                    <div className="source-name">Referral</div>
                                    <div className="source-stats">
                                        <span>10%</span>
                                        <div className="source-bar" style={{ width: '10%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-reports">
                        <h3>Additional Reports</h3>
                        <div className="reports-grid">
                            <div className="report-card">
                                <h4>User Demographics</h4>
                                <p>Age, gender, location data</p>
                                <button className="btn-secondary">View Report</button>
                            </div>
                            <div className="report-card">
                                <h4>Device Analytics</h4>
                                <p>Desktop vs mobile usage</p>
                                <button className="btn-secondary">View Report</button>
                            </div>
                            <div className="report-card">
                                <h4>Goal Conversions</h4>
                                <p>Track conversion rates</p>
                                <button className="btn-secondary">View Report</button>
                            </div>
                            <div className="report-card">
                                <h4>Real-time Analytics</h4>
                                <p>Live visitor tracking</p>
                                <button className="btn-secondary">View Live</button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Analytics;