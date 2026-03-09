
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, TimeEntry, Job } from '../types';

const calculateDuration = (clockIn: string, clockOut?: string): number => {
    if (!clockOut) return 0;
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    return (end - start) / (1000 * 60 * 60); // duration in hours
};

export const generatePayReport = (profile: UserProfile, timeEntries: TimeEntry[]) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('Pay Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Employee: ${profile.name}`, 14, 32);
    doc.text(`Hourly Wage: $${profile.hourlyWage.toFixed(2)}`, 14, 38);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 44);

    const tableColumn = ["Date", "Project", "Clock In", "Clock Out", "Duration (hrs)", "Pay ($)"];
    const tableRows: (string | number)[][] = [];
    
    let totalHours = 0;
    let totalPay = 0;

    const sortedEntries = [...timeEntries].sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

    sortedEntries.forEach(entry => {
        const duration = calculateDuration(entry.clockIn, entry.clockOut);
        const pay = duration * profile.hourlyWage;
        totalHours += duration;
        totalPay += pay;

        const entryData = [
            new Date(entry.clockIn).toLocaleDateString(),
            entry.projectName || 'General',
            new Date(entry.clockIn).toLocaleTimeString(),
            entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : 'N/A',
            duration.toFixed(2),
            pay.toFixed(2)
        ];
        tableRows.push(entryData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(14);
    doc.text('Summary', 14, finalY + 15);
    doc.setFontSize(12);
    doc.text(`Total Hours Worked: ${totalHours.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Total Pay: $${totalPay.toFixed(2)}`, 14, finalY + 28);

    doc.save(`Pay_Report_${profile.name.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── Premium Pay Report ────────────────────────────────────────────────────────

interface PremiumReportOptions {
    profile: UserProfile;
    timeEntries: TimeEntry[];
    jobs: Job[];
    periodStart: Date;
    periodEnd: Date;
    includePhotos: boolean;
    includeTasks: boolean;
}

export const generatePremiumPayReport = async (options: PremiumReportOptions) => {
    const { profile, timeEntries, jobs, periodStart, periodEnd, includePhotos, includeTasks } = options;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ═══ Header ═══
    doc.setFillColor(24, 119, 242); // fb-blue
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Premium Pay Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`${periodStart.toLocaleDateString()} — ${periodEnd.toLocaleDateString()}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 28, { align: 'right' });

    // ═══ Employee Info ═══
    doc.setTextColor(5, 5, 5);
    doc.setFontSize(12);
    doc.text(`Employee: ${profile.name}`, 14, 48);
    doc.text(`Default Rate: $${profile.hourlyWage.toFixed(2)}/hr`, 14, 55);

    // ═══ Summary Section ═══
    let totalHours = 0;
    let totalPay = 0;
    const byProject: Record<string, { hours: number; pay: number; entries: number }> = {};

    const completedEntries = timeEntries.filter(e => e.clockOut);
    const sortedEntries = [...completedEntries].sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

    sortedEntries.forEach(entry => {
        const hours = calculateDuration(entry.clockIn, entry.clockOut);
        const job = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
        const rate = job?.hourlyRate || profile.hourlyWage;
        const pay = hours * rate;
        totalHours += hours;
        totalPay += pay;

        const name = entry.projectName || 'General';
        if (!byProject[name]) byProject[name] = { hours: 0, pay: 0, entries: 0 };
        byProject[name].hours += hours;
        byProject[name].pay += pay;
        byProject[name].entries += 1;
    });

    // Summary box
    doc.setDrawColor(206, 208, 212);
    doc.setFillColor(240, 242, 245);
    doc.roundedRect(14, 62, pageWidth - 28, 24, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(101, 103, 107);
    doc.text('TOTAL HOURS', 24, 72);
    doc.text('TOTAL PAY', pageWidth / 2, 72);
    doc.text('ENTRIES', pageWidth - 50, 72);
    doc.setFontSize(14);
    doc.setTextColor(5, 5, 5);
    doc.text(totalHours.toFixed(2), 24, 82);
    doc.setTextColor(66, 183, 42);
    doc.text(`$${totalPay.toFixed(2)}`, pageWidth / 2, 82);
    doc.setTextColor(5, 5, 5);
    doc.text(`${sortedEntries.length}`, pageWidth - 50, 82);

    // ═══ Per-Project Breakdown ═══
    let yPos = 96;
    if (Object.keys(byProject).length > 1) {
        doc.setFontSize(13);
        doc.setTextColor(5, 5, 5);
        doc.text('Breakdown by Project/Job', 14, yPos);
        yPos += 4;

        const projectRows = Object.entries(byProject).map(([name, data]) => [
            name,
            data.entries.toString(),
            data.hours.toFixed(2),
            `$${data.pay.toFixed(2)}`,
        ]);

        autoTable(doc, {
            head: [['Project', 'Entries', 'Hours', 'Pay']],
            body: projectRows,
            startY: yPos,
            theme: 'grid',
            headStyles: { fillColor: [24, 119, 242], fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right', textColor: [66, 183, 42], fontStyle: 'bold' },
            },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // ═══ Detailed Time Entries ═══
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFontSize(13);
    doc.setTextColor(5, 5, 5);
    doc.text('Detailed Time Log', 14, yPos);
    yPos += 4;

    const detailRows = sortedEntries.map(entry => {
        const hours = calculateDuration(entry.clockIn, entry.clockOut);
        const job = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
        const rate = job?.hourlyRate || profile.hourlyWage;
        const pay = hours * rate;
        return [
            new Date(entry.clockIn).toLocaleDateString(),
            entry.projectName || 'General',
            new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            hours.toFixed(2),
            `$${rate.toFixed(2)}`,
            `$${pay.toFixed(2)}`,
        ];
    });

    autoTable(doc, {
        head: [['Date', 'Project', 'In', 'Out', 'Hours', 'Rate', 'Pay']],
        body: detailRows,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [24, 119, 242], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', textColor: [66, 183, 42], fontStyle: 'bold' },
        },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ═══ Tasks Section ═══
    if (includeTasks && jobs.length > 0) {
        const jobsWithTasks = jobs.filter(j => j.tasks.length > 0);
        if (jobsWithTasks.length > 0) {
            if (yPos > 220) { doc.addPage(); yPos = 20; }
            doc.setFontSize(13);
            doc.setTextColor(5, 5, 5);
            doc.text('Tasks Overview', 14, yPos);
            yPos += 8;

            for (const job of jobsWithTasks) {
                if (yPos > 250) { doc.addPage(); yPos = 20; }
                doc.setFontSize(11);
                doc.setTextColor(24, 119, 242);
                doc.text(`${job.name}${job.client ? ` — ${job.client}` : ''}`, 14, yPos);
                yPos += 4;

                const taskRows = job.tasks.map(t => [
                    t.title,
                    t.status === 'completed' ? 'Done' : t.status === 'in-progress' ? 'In Progress' : 'Pending',
                    t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '—',
                    t.photos.length > 0 ? `${t.photos.length} photo(s)` : '—',
                ]);

                autoTable(doc, {
                    head: [['Task', 'Status', 'Completed', 'Photos']],
                    body: taskRows,
                    startY: yPos,
                    theme: 'grid',
                    headStyles: { fillColor: [101, 103, 107], fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    columnStyles: {
                        1: {
                            cellWidth: 28,
                        },
                    },
                    didParseCell: (data: any) => {
                        if (data.section === 'body' && data.column.index === 1) {
                            const val = data.cell.raw;
                            if (val === 'Done') data.cell.styles.textColor = [66, 183, 42];
                            else if (val === 'In Progress') data.cell.styles.textColor = [24, 119, 242];
                            else data.cell.styles.textColor = [138, 141, 145];
                        }
                    },
                });

                yPos = (doc as any).lastAutoTable.finalY + 8;
            }
        }
    }

    // ═══ Photos Section ═══
    if (includePhotos) {
        const allPhotos: { source: string; dataUrl: string; caption: string }[] = [];

        // Collect job photos
        jobs.forEach(job => {
            job.photos.forEach(p => {
                allPhotos.push({ source: job.name, dataUrl: p.dataUrl, caption: p.caption });
            });
            job.tasks.forEach(task => {
                task.photos.forEach(p => {
                    allPhotos.push({ source: `${job.name} > ${task.title}`, dataUrl: p.dataUrl, caption: p.caption });
                });
            });
        });

        // Collect time entry photos
        timeEntries.forEach(entry => {
            (entry.photos || []).forEach(p => {
                allPhotos.push({ source: entry.projectName || 'General', dataUrl: p.dataUrl, caption: p.caption });
            });
        });

        if (allPhotos.length > 0) {
            doc.addPage();
            yPos = 20;
            doc.setFontSize(13);
            doc.setTextColor(5, 5, 5);
            doc.text('Photo Documentation', 14, yPos);
            yPos += 10;

            for (const photo of allPhotos) {
                if (yPos > 220) { doc.addPage(); yPos = 20; }
                try {
                    doc.addImage(photo.dataUrl, 'JPEG', 14, yPos, 60, 45);
                    doc.setFontSize(8);
                    doc.setTextColor(101, 103, 107);
                    doc.text(photo.source, 80, yPos + 6);
                    doc.setTextColor(5, 5, 5);
                    doc.setFontSize(9);
                    doc.text(photo.caption, 80, yPos + 14);
                    yPos += 52;
                } catch {
                    // skip photos that fail to embed
                    doc.setFontSize(8);
                    doc.text(`[Photo: ${photo.caption}]`, 14, yPos);
                    yPos += 8;
                }
            }
        }
    }

    // ═══ Footer on all pages ═══
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(138, 141, 145);
        doc.text(
            `GeoTime Premium Report — Page ${i} of ${totalPages}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
        );
    }

    doc.save(`Premium_Report_${profile.name.replace(/\s+/g, '_')}_${periodStart.toISOString().split('T')[0]}_to_${periodEnd.toISOString().split('T')[0]}.pdf`);
};
