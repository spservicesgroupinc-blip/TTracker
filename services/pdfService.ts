
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, TimeEntry } from '../types';

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
