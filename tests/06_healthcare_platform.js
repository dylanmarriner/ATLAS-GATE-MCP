/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: Property-based architecture
 * PURPOSE: Healthcare platform with patient, doctor, and hospital management
 * FAILURE MODES: Invalid patient throws error, invalid doctor throws error, missing appointment details throw error
 *
 * Authority: 06-csharp-properties.md
 */

// Plan 06: Healthcare Management Platform (C# architectural patterns)
class Patient {
  constructor(patientId, firstName, lastName, dateOfBirth) {
    this.patientId = patientId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.dateOfBirth = new Date(dateOfBirth);
    this.email = '';
    this.phone = '';
    this.address = '';
    this.appointments = [];
    this.medicalRecords = [];
    this.medications = [];
    this.createdAt = new Date();
  }
  
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }
  
  getAge() {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }
  
  scheduleAppointment(doctorId, appointmentDate) {
    if (!doctorId || !appointmentDate) {
      throw new Error('Doctor and date required');
    }
    this.appointments.push({
      appointmentId: Math.random().toString(36).substr(2, 9),
      doctorId,
      appointmentDate: new Date(appointmentDate),
      status: 'scheduled',
      createdAt: new Date()
    });
  }
  
  addMedicalRecord(diagnosis, treatment, doctorId) {
    if (!diagnosis || !treatment) {
      throw new Error('Diagnosis and treatment required');
    }
    this.medicalRecords.push({
      recordId: Math.random().toString(36).substr(2, 9),
      diagnosis,
      treatment,
      doctorId,
      recordDate: new Date()
    });
  }
  
  prescribeMedication(medicationName, dosage, frequency) {
    if (!medicationName || !dosage || !frequency) {
      throw new Error('Medication details required');
    }
    this.medications.push({
      medicationId: Math.random().toString(36).substr(2, 9),
      name: medicationName,
      dosage,
      frequency,
      startDate: new Date(),
      isActive: true
    });
  }
}

class Doctor {
  constructor(doctorId, name, specialization, licenseNumber) {
    this.doctorId = doctorId;
    this.name = name;
    this.specialization = specialization;
    this.licenseNumber = licenseNumber;
    this.isLicensed = true;
    this.appointments = [];
    this.patientsCaredFor = [];
  }
  
  schedulePatient(patient, appointmentDate) {
    if (!patient.patientId) {
      throw new Error('Invalid patient');
    }
    this.appointments.push({
      appointmentId: Math.random().toString(36).substr(2, 9),
      patientId: patient.patientId,
      appointmentDate: new Date(appointmentDate),
      status: 'scheduled'
    });
    
    if (!this.patientsCaredFor.includes(patient.patientId)) {
      this.patientsCaredFor.push(patient.patientId);
    }
  }
}

class Hospital {
  constructor(hospitalId, name, address) {
    this.hospitalId = hospitalId;
    this.name = name;
    this.address = address;
    this.departments = [];
    this.doctors = [];
    this.patients = [];
  }
  
  registerPatient(patient) {
    if (!patient.patientId) {
      throw new Error('Invalid patient');
    }
    this.patients.push(patient);
  }
  
  hireDoctor(doctor) {
    if (!doctor.doctorId || !doctor.licenseNumber) {
      throw new Error('Invalid doctor');
    }
    this.doctors.push(doctor);
  }
  
  getDoctorsBySpecialty(specialty) {
    return this.doctors.filter(d => d.specialization === specialty);
  }
  
  getPatientCount() {
    return this.patients.length;
  }
}

const patient1 = new Patient('PAT001', 'Michael', 'Johnson', '1985-06-15');
patient1.email = 'michael.johnson@email.com';
patient1.phone = '5551234567';

const patient2 = new Patient('PAT002', 'Jennifer', 'Williams', '1990-09-22');
patient2.email = 'jennifer.w@email.com';
patient2.phone = '5559876543';

const doctor1 = new Doctor('DOC001', 'Dr. Robert Chen', 'Cardiology', 'LIC-12345');
const doctor2 = new Doctor('DOC002', 'Dr. Lisa Anderson', 'Neurology', 'LIC-12346');

patient1.scheduleAppointment('DOC001', '2024-02-15T10:00:00');
patient1.addMedicalRecord('Hypertension', 'Prescribed lisinopril', 'DOC001');
patient1.prescribeMedication('Lisinopril', '10mg', 'Once daily');

const hospital = new Hospital('HOSP001', 'Central Medical Center', '123 Main St');
hospital.registerPatient(patient1);
hospital.registerPatient(patient2);
hospital.hireDoctor(doctor1);
hospital.hireDoctor(doctor2);

module.exports = { Patient, Doctor, Hospital, hospital };
