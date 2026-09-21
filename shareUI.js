const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectDashboard.tsx', 'utf8');

// Add Share icon to imports
code = code.replace(/import \{ Folder, Plus, Copy, Trash2, Play, Settings, Database, Code, ShieldAlert, LogOut, User \} from 'lucide-react';/,
`import { Folder, Plus, Copy, Trash2, Play, Settings, Database, Code, ShieldAlert, LogOut, User, Share2, X } from 'lucide-react';`);

// Add sharing state
code = code.replace(/const \[loading, setLoading\] = useState\(true\);/,
`const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingProject, setSharingProject] = useState<Project | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);`);

// Fetch users for share modal
code = code.replace(/useEffect\(\(\) => \{\n\s*loadProjects\(\);\n\s*\}, \[\]\);/,
`useEffect(() => {
    loadProjects();
    if (user?.role === 'SUPERUSER' || user?.role === 'ADMIN') {
      fetch('/api/admin/users').then(r => r.json()).then(d => {
        if(d.users) setSystemUsers(d.users);
      }).catch(()=>{});
    }
  }, [user]);

  const openShareModal = (p: Project) => {
    setSharingProject(p);
    // Fetch current shared_with status
    fetch(\`/api/pipelines?id=\${p.id}\`).then(r => r.json()).then(d => {
      setSharedWith(d.pipeline?.shared_with || []);
      setShareModalOpen(true);
    }).catch(console.error);
  };

  const saveSharing = async () => {
    if (!sharingProject) return;
    try {
      const res = await fetch('/api/pipelines/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sharingProject.id, shared_with: sharedWith })
      });
      if (res.ok) {
        setShareModalOpen(false);
        setSharingProject(null);
      } else {
        alert('Failed to share project');
      }
    } catch(e) {
      console.error(e);
      alert('Error sharing project');
    }
  };
`);

// Add share button
code = code.replace(/\{p\.owner_id === user\?\.id && \(\n\s*<button \n\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); deleteProject\(p\.id\); \}\}/,
`{(p.owner_id === user?.id || user?.role === 'SUPERUSER') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); openShareModal(p); }}
                        className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                        title="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                    {p.owner_id === user?.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}`);

// Add Modal JSX
code = code.replace(/<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\}/,
`</div>
      </div>

      {shareModalOpen && sharingProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-code-bg border border-border rounded-xl shadow-glow p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-h">Share "{sharingProject.name}"</h3>
              <button onClick={() => setShareModalOpen(false)} className="text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {systemUsers.filter(u => u.id !== sharingProject.owner_id).map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-bg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sharedWith.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSharedWith([...sharedWith, u.id]);
                      else setSharedWith(sharedWith.filter(id => id !== u.id));
                    }}
                    className="rounded border-border bg-bg text-accent focus:ring-accent"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">{u.email}</span>
                    <span className="text-xs text-text-muted">{u.role}</span>
                  </div>
                </label>
              ))}
              {systemUsers.length === 0 && (
                <div className="text-sm text-text-muted italic">Only admins can fetch user lists for sharing right now.</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
              <button 
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 rounded font-medium text-sm text-text-muted hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveSharing}
                className="px-4 py-2 rounded font-medium text-sm bg-accent text-white hover-lift shadow-glow"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}`);

fs.writeFileSync('src/components/ProjectDashboard.tsx', code);
