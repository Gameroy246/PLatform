import localforage from 'localforage';

localforage.config({
  name: 'LocalDataArchitect',
  storeName: 'workspaces'
});

export const saveProjectData = async (projectId: string, data: any) => {
  try {
    await localforage.setItem(`ARCHITECT_PROJ_${projectId}`, data);
  } catch (err) {
    console.error('Failed to save project data to IndexedDB', err);
  }
};

export const loadProjectData = async (projectId: string) => {
  try {
    return await localforage.getItem(`ARCHITECT_PROJ_${projectId}`);
  } catch (err) {
    console.error('Failed to load project data from IndexedDB', err);
    return null;
  }
};

export const saveSnapshots = async (projectId: string, snapshots: any[]) => {
  try {
    // Only save the last 15 snapshots to prevent bloating IndexedDB
    await localforage.setItem(`ARCHITECT_PROJ_${projectId}_SNAPSHOTS`, snapshots.slice(-15));
  } catch (err) {
    console.error('Failed to save snapshots to IndexedDB', err);
  }
};

export const loadSnapshots = async (projectId: string) => {
  try {
    return (await localforage.getItem(`ARCHITECT_PROJ_${projectId}_SNAPSHOTS`)) || [];
  } catch (err) {
    console.error('Failed to load snapshots from IndexedDB', err);
    return [];
  }
};

export const getProjectMetadata = () => {
    try {
        const stored = localStorage.getItem('ARCHITECT_PROJECTS');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [];
};
