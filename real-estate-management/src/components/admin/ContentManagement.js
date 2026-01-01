import React, { useState, useEffect } from 'react';
import { adminAPI } from "../../services/api";


function ContentManagement() {
    const [pages, setPages] = useState([]);
    const [selectedPage, setSelectedPage] = useState(null);
    const [content, setContent] = useState('');
    const [seoData, setSeoData] = useState({
        title: '',
        description: '',
        keywords: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Mock data
    const mockPages = [
        { id: 1, name: 'home', title: 'Home Page', lastModified: '2023-10-15' },
        { id: 2, name: 'about', title: 'About Us', lastModified: '2023-10-14' },
        { id: 3, name: 'contact', title: 'Contact', lastModified: '2023-10-13' },
        { id: 4, name: 'services', title: 'Services', lastModified: '2023-10-12' },
        { id: 5, name: 'faq', title: 'FAQ', lastModified: '2023-10-11' }
    ];

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setLoading(true);
        setTimeout(() => {
            setPages(mockPages);
            setLoading(false);
        }, 1000);
    };

const loadPage = async (pageName) => {
    setSelectedPage(pageName);
    setLoading(true);
    
    try {
        // Try to fetch existing content
        const response = await adminAPI.getPageContent(pageName);
        if (response.data.success && response.data.content.length > 0) {
            const pageData = response.data.content[0];
            setContent(pageData.content || '');
            setSeoData({
                title: pageData.seo_title || '',
                description: pageData.seo_description || '',
                keywords: pageData.seo_keywords || ''
            });
        } else {
            // If no content exists, use defaults
            setContent(`<h1>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page</h1>
<p>This is the content for the ${pageName} page. Edit this content as needed.</p>
<p>You can use HTML tags to format your content.</p>`);
            
            setSeoData({
                title: `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - Real Estate`,
                description: `Description for ${pageName} page`,
                keywords: `${pageName}, real estate, property`
            });
        }
    } catch (error) {
        console.error('Error loading page:', error);
        // Fallback to default content
        setContent(`<h1>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page</h1>
<p>This is the content for the ${pageName} page. Edit this content as needed.</p>`);
    } finally {
        setLoading(false);
    }
};

    const saveContent = async () => {
        if (!selectedPage) return;
        
        setSaving(true);
        setTimeout(() => {
            alert(`Content saved for ${selectedPage} page!`);
            setSaving(false);
        }, 1500);
    };

    const createNewPage = () => {
        const pageName = prompt('Enter new page name (no spaces, lowercase):');
        if (pageName) {
            const newPage = {
                id: pages.length + 1,
                name: pageName.toLowerCase().replace(/\s+/g, '-'),
                title: pageName.charAt(0).toUpperCase() + pageName.slice(1),
                lastModified: new Date().toISOString().split('T')[0]
            };
            setPages([...pages, newPage]);
            loadPage(newPage.name);
        }
    };

    const deletePage = (pageName) => {
        if (window.confirm(`Delete page "${pageName}"? This cannot be undone.`)) {
            setPages(pages.filter(p => p.name !== pageName));
            if (selectedPage === pageName) {
                setSelectedPage(null);
                setContent('');
            }
        }
    };

    return (
        <div className="content-management">
            <div className="page-header">
                <h2>Content Management (CMS)</h2>
                <button className="btn-primary" onClick={createNewPage}>
                    + Create New Page
                </button>
            </div>

            <div className="content-layout">
                <div className="pages-sidebar">
                    <h3>Pages</h3>
                    {loading ? (
                        <div className="loading">Loading pages...</div>
                    ) : (
                        <div className="pages-list">
                            {pages.map(page => (
                                <div 
                                    key={page.id}
                                    className={`page-item ${selectedPage === page.name ? 'active' : ''}`}
                                    onClick={() => loadPage(page.name)}
                                >
                                    <div className="page-name">{page.title}</div>
                                    <div className="page-meta">
                                        <span>/{page.name}</span>
                                        <span>Updated: {page.lastModified}</span>
                                    </div>
                                    <button 
                                        className="btn-danger btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deletePage(page.name);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="content-editor">
                    {selectedPage ? (
                        <>
                            <div className="editor-header">
                                <h3>Editing: {selectedPage}</h3>
                                <button 
                                    className="btn-primary"
                                    onClick={saveContent}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            <div className="editor-tabs">
                                <div className="tab active">Content</div>
                                <div className="tab">SEO</div>
                                <div className="tab">Preview</div>
                            </div>

                            <div className="editor-content">
                                <div className="form-group">
                                    <label>Page Content (HTML)</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        rows={15}
                                        placeholder="Enter HTML content here..."
                                    />
                                </div>

                                <div className="seo-section">
                                    <h4>SEO Settings</h4>
                                    <div className="form-group">
                                        <label>Meta Title</label>
                                        <input
                                            type="text"
                                            value={seoData.title}
                                            onChange={(e) => setSeoData({...seoData, title: e.target.value})}
                                            placeholder="Page title for SEO"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Meta Description</label>
                                        <textarea
                                            value={seoData.description}
                                            onChange={(e) => setSeoData({...seoData, description: e.target.value})}
                                            rows={3}
                                            placeholder="Page description for SEO"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Meta Keywords</label>
                                        <input
                                            type="text"
                                            value={seoData.keywords}
                                            onChange={(e) => setSeoData({...seoData, keywords: e.target.value})}
                                            placeholder="Comma-separated keywords"
                                        />
                                    </div>
                                </div>

                                <div className="preview-section">
                                    <h4>Content Preview</h4>
                                    <div 
                                        className="content-preview"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Select a page to edit or create a new page.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="content-tools">
                <h3>Content Tools</h3>
                <div className="tools-grid">
                    <div className="tool-card">
                        <h4>Media Library</h4>
                        <p>Upload and manage images, documents</p>
                        <button className="btn-secondary">Open Media Library</button>
                    </div>
                    <div className="tool-card">
                        <h4>Templates</h4>
                        <p>Pre-designed page templates</p>
                        <button className="btn-secondary">Browse Templates</button>
                    </div>
                    <div className="tool-card">
                        <h4>Bulk Operations</h4>
                        <p>Update multiple pages at once</p>
                        <button className="btn-secondary">Bulk Edit</button>
                    </div>
                    <div className="tool-card">
                        <h4>Revision History</h4>
                        <p>View and restore previous versions</p>
                        <button className="btn-secondary">View History</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContentManagement;