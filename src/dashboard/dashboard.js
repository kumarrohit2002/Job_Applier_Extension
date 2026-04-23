import { StorageService } from '../background/services/StorageService.js';

const storage = new StorageService();

document.addEventListener('DOMContentLoaded', async () => {
    initDashboard();
});

async function initDashboard() {
    const leads = await storage.getLeads();
    renderLeads(leads);
    updateStats(leads);

    // Event Listeners
    document.getElementById('export-btn').addEventListener('click', () => exportLeads(leads));
}

function renderLeads(leads) {
    const tbody = document.querySelector('#leads-table tbody');
    const noLeads = document.getElementById('no-leads');

    if (!leads || leads.length === 0) {
        tbody.innerHTML = '';
        noLeads.style.display = 'block';
        return;
    }

    noLeads.style.display = 'none';
    tbody.innerHTML = leads.map((lead, index) => `
        <tr>
            <td>
                <div style="font-weight: 600;">${lead.company || 'Unknown'}</div>
                <div style="font-size: 0.8rem; color: #94a3b8;">${new Date(lead.createdAt).toLocaleDateString()}</div>
            </td>
            <td>${lead.title || 'N/A'}</td>
            <td><code>${lead.email}</code></td>
            <td><span class="status-badge status-${lead.status || 'new'}">${lead.status || 'new'}</span></td>
            <td>
                <button class="btn btn-primary btn-sm apply-btn" data-id="${lead.id}">Draft Email</button>
            </td>
        </tr>
    `).join('');

    // Attach row actions
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDraft(btn.dataset.id));
    });
}

async function handleDraft(leadId) {
    const leads = await storage.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const btn = document.querySelector(`[data-id="${leadId}"]`);
    btn.textContent = 'Creating...';
    btn.disabled = true;

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'sendEmail',
            email: lead.email,
            subject: `Application for ${lead.title}`,
            body: lead.personalizedBody || lead.context
        });

        if (response.error) throw new Error(response.error);

        await storage.updateLeadStatus(leadId, 'applied');
        btn.textContent = 'Draft Created!';
        initDashboard(); // refresh
    } catch (error) {
        console.error('Draft failed:', error);
        btn.textContent = 'Error';
    } finally {
        setTimeout(() => {
            btn.textContent = 'Draft Email';
            btn.disabled = false;
        }, 3000);
    }
}

function updateStats(leads) {
    document.getElementById('stat-total').textContent = leads.length;
    document.getElementById('stat-applied').textContent = leads.filter(l => l.status === 'applied').length;
    document.getElementById('stat-interviews').textContent = leads.filter(l => l.status === 'interview').length;
}

function exportLeads(leads) {
    if (!leads.length) return;
    
    const headers = ['Company', 'Title', 'Email', 'Status', 'Date Found'];
    const rows = leads.map(l => [
        `"${l.company}"`,
        `"${l.title}"`,
        l.email,
        l.status,
        new Date(l.createdAt).toLocaleDateString()
    ].join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}
