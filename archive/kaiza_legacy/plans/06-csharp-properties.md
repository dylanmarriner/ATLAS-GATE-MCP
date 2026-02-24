---
status: APPROVED
title: "C# Full-Stack Healthcare Management Platform"
description: "Enterprise healthcare system using .NET 7, Entity Framework, and Azure cloud infrastructure"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/csharp/**"
---

# C# Full-Stack Implementation Plan

## Overview
Build a comprehensive healthcare platform with patient management, appointment scheduling, electronic health records, and medical billing integration using C# and .NET 7.

## Architecture

### Backend (.NET 7 + ASP.NET Core)
- Microservices architecture with separate domain services
- Entity Framework Core with complex model mappings
- CQRS pattern with MediatR
- Event sourcing for audit trails
- Azure Service Bus for async messaging

### Frontend (Blazor WebAssembly)
- Component-based reactive UI
- Real-time updates with SignalR
- Offline-first with local storage
- Progressive enhancement
- Accessibility compliance (WCAG 2.1)

## Data Model & Properties

### 1. Entity Models with Properties
```csharp
public class Patient {
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public DateTime DateOfBirth { get; set; }
    
    public string FullName => $"{FirstName} {LastName}";
    public int Age => DateTime.Now.Year - DateOfBirth.Year;
    
    public ICollection<Appointment> Appointments { get; set; }
    public ICollection<MedicalRecord> Records { get; set; }
}

public class Appointment {
    public int Id { get; set; }
    public DateTime ScheduledTime { get; set; }
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    
    public AppointmentStatus Status { get; set; }
    
    public Patient Patient { get; set; }
    public Doctor Doctor { get; set; }
    
    public bool IsUpcoming => ScheduledTime > DateTime.Now;
    public bool CanBeCancelled => Status == AppointmentStatus.Scheduled;
}

public class Doctor {
    public int Id { get; set; }
    public string Name { get; set; }
    public string License { get; set; }
    public string Specialization { get; set; }
    
    public ICollection<Appointment> Appointments { get; set; }
}

public class MedicalRecord {
    public int Id { get; set; }
    public int PatientId { get; set; }
    public DateTime CreatedDate { get; set; }
    public string Diagnosis { get; set; }
    public string Treatment { get; set; }
    
    public Patient Patient { get; set; }
    
    public bool IsRecent => DateTime.Now - CreatedDate < TimeSpan.FromDays(30);
}
```

### 2. Value Objects & DTOs
```csharp
public class Address {
    public string Street { get; set; }
    public string City { get; set; }
    public string State { get; set; }
    public string ZipCode { get; set; }
    
    public override string ToString() => $"{Street}, {City}, {State} {ZipCode}";
}

public record PatientDto(
    int Id,
    string FirstName,
    string LastName,
    DateTime DateOfBirth,
    Address Address,
    string PhoneNumber);
```

## CQRS Pattern Implementation

### 1. Commands
```csharp
public record CreateAppointmentCommand(
    int PatientId,
    int DoctorId,
    DateTime ScheduledTime) : IRequest<AppointmentDto>;

public record UpdatePatientRecordCommand(
    int PatientId,
    string Diagnosis,
    string Treatment) : IRequest<Unit>;

public record CancelAppointmentCommand(
    int AppointmentId,
    string CancellationReason) : IRequest<Unit>;

public class CreateAppointmentHandler : IRequestHandler<CreateAppointmentCommand, AppointmentDto> {
    public async Task<AppointmentDto> Handle(CreateAppointmentCommand request, CancellationToken ct) {
        // Implementation
    }
}
```

### 2. Queries
```csharp
public record GetPatientAppointmentsQuery(int PatientId) : IRequest<List<AppointmentDto>>;

public record SearchDoctorsQuery(string Specialization) : IRequest<List<DoctorDto>>;

public record GetUpcomingAppointmentsQuery(int DaysAhead) : IRequest<List<AppointmentDto>>;

public class GetPatientAppointmentsHandler : IRequestHandler<GetPatientAppointmentsQuery, List<AppointmentDto>> {
    public async Task<List<AppointmentDto>> Handle(GetPatientAppointmentsQuery request, CancellationToken ct) {
        // Implementation
    }
}
```

## Core Features

### 1. Patient Management
- Patient registration with validation
- Medical history tracking
- Allergy and medication records
- Insurance information management
- Consent and privacy preferences
- Document storage and access

### 2. Appointment System
- Appointment scheduling with doctor availability
- Automated reminders (SMS/Email)
- Rescheduling and cancellation
- No-show tracking
- Appointment confirmations
- Calendar integration

### 3. Electronic Health Records (EHR)
- Structured clinical notes
- Diagnostic codes (ICD-10)
- Medication management
- Vital signs tracking
- Lab results integration
- Imaging report storage
- Audit trail for compliance

### 4. Billing & Insurance
- Invoice generation
- Insurance claim submission
- Payment processing
- Refund management
- Coverage verification
- Medical coding (CPT, ICD-10)

### 5. Doctor Portal
- Schedule management
- Patient lookup
- Appointment notes
- Prescription management
- Patient communication
- Performance metrics

### 6. Admin Dashboard
- System analytics
- User management
- Report generation
- Configuration management
- System health monitoring

## Async/Await Patterns

### 1. Async Service Methods
```csharp
public class AppointmentService {
    public async Task<AppointmentDto> CreateAppointmentAsync(CreateAppointmentRequest request) {
        var patient = await _patientRepository.GetAsync(request.PatientId);
        var doctor = await _doctorRepository.GetAsync(request.DoctorId);
        
        var appointment = new Appointment {
            PatientId = request.PatientId,
            DoctorId = request.DoctorId,
            ScheduledTime = request.ScheduledTime
        };
        
        await _appointmentRepository.AddAsync(appointment);
        await _unitOfWork.SaveChangesAsync();
        
        await _notificationService.SendConfirmationAsync(patient, appointment);
        
        return _mapper.Map<AppointmentDto>(appointment);
    }
    
    public async Task<List<AppointmentDto>> GetUpcomingAppointmentsAsync(int doctorId) {
        var appointments = await _appointmentRepository
            .Query()
            .Where(a => a.DoctorId == doctorId && a.IsUpcoming)
            .OrderBy(a => a.ScheduledTime)
            .ToListAsync();
        
        return _mapper.Map<List<AppointmentDto>>(appointments);
    }
}
```

### 2. Parallel Processing
```csharp
public async Task SendAppointmentRemindersAsync() {
    var appointments = await _appointmentRepository
        .GetAppointmentsDueForReminderAsync();
    
    var tasks = appointments
        .Select(a => _notificationService.SendReminderAsync(a))
        .ToList();
    
    await Task.WhenAll(tasks);
}
```

## Data Access with Entity Framework

### 1. DbContext Configuration
```csharp
public class HealthcareDbContext : DbContext {
    public DbSet<Patient> Patients { get; set; }
    public DbSet<Doctor> Doctors { get; set; }
    public DbSet<Appointment> Appointments { get; set; }
    public DbSet<MedicalRecord> MedicalRecords { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        modelBuilder.Entity<Patient>()
            .HasMany(p => p.Appointments)
            .WithOne(a => a.Patient)
            .HasForeignKey(a => a.PatientId);
        
        modelBuilder.Entity<Appointment>()
            .Property(a => a.Status)
            .HasConversion<string>();
    }
}
```

### 2. Repository Pattern
```csharp
public class PatientRepository : IRepository<Patient> {
    private readonly HealthcareDbContext _context;
    
    public async Task<Patient> GetAsync(int id) => 
        await _context.Patients
            .Include(p => p.Appointments)
            .FirstOrDefaultAsync(p => p.Id == id);
    
    public async Task<List<Patient>> SearchAsync(string query) =>
        await _context.Patients
            .Where(p => p.FirstName.Contains(query) || p.LastName.Contains(query))
            .ToListAsync();
}
```

## SignalR Real-Time Features

### 1. Hub Implementation
```csharp
public class AppointmentHub : Hub {
    public async Task NotifyAppointmentCreated(AppointmentDto appointment) {
        await Clients.All.SendAsync("AppointmentCreated", appointment);
    }
    
    public async Task NotifyDoctorStatusChange(int doctorId, string status) {
        await Clients.Group($"doctor-{doctorId}")
            .SendAsync("DoctorStatusChanged", doctorId, status);
    }
}
```

## Security & Compliance

### 1. Authentication & Authorization
- Azure AD integration for healthcare organizations
- Role-based access control (RBAC)
- Multi-factor authentication
- Session management

### 2. Data Protection
- Encryption at rest and in transit
- PII masking in logs
- HIPAA compliance
- Audit logging
- Data retention policies

## Testing Strategy

### 1. Unit Tests
- Domain logic testing
- Service layer testing with mocks
- Property calculation testing

### 2. Integration Tests
- EF Core with test database
- API endpoint testing
- Transaction testing

### 3. End-to-End Tests
- Blazor component testing
- Full workflow testing

## Deployment

### 1. Azure Deployment
- App Service hosting
- SQL Database
- Blob Storage for documents
- Application Insights monitoring
- Key Vault for secrets

### 2. DevOps Pipeline
- GitHub Actions CI/CD
- Container registry
- Automated testing
- Blue/Green deployment

## Deliverables

1. .NET 7 REST API with comprehensive endpoints
2. Blazor WebAssembly frontend
3. Entity Framework Core models with relationships
4. CQRS implementation with MediatR
5. SignalR real-time functionality
6. Authentication & authorization layer
7. Comprehensive test suite
8. Docker containerization
9. Azure deployment configuration
10. API documentation with Swagger
11. HIPAA compliance documentation
