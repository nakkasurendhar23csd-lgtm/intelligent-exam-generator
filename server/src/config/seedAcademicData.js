const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { getEmbedding } = require('../services/vectorService');
const { createChunks } = require('../services/documentExtractor');

const SAMPLE_DOCUMENT_TEXT = `
DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
COURSE SYLLABUS: CLOUD COMPUTING AND DISTRIBUTED SYSTEMS (CS8041)
ACADEMIC YEAR: 2026-2027

UNIT 1: CLOUD ARCHITECTURE AND SERVICE MODELS
Cloud computing is a model for enabling ubiquitous, convenient, on-demand network access to a shared pool of configurable computing resources (e.g., networks, servers, storage, applications, and services) that can be rapidly provisioned and released with minimal management effort or service provider interaction. According to the National Institute of Standards and Technology (NIST), cloud computing encompasses five essential characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service.
The architecture comprises three primary service models: Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS). In IaaS, consumers provision processing, storage, networks, and fundamental computing resources where they can deploy and run arbitrary software including operating systems and applications. In PaaS, consumers deploy consumer-created or acquired applications onto the cloud infrastructure using programming languages, libraries, services, and tools supported by the provider without managing the underlying cloud infrastructure. In SaaS, the capability provided is to use the provider's applications running on cloud infrastructure accessible from various client devices through a thin client interface such as a web browser. Deployment models include Private Cloud, Community Cloud, Public Cloud, and Hybrid Cloud.

UNIT 2: VIRTUALIZATION AND HYPERVISOR ARCHITECTURE
Virtualization is the foundational technology enabling cloud multi-tenancy and efficient hardware utilization. It abstracts physical computing hardware into logical entities known as virtual machines (VMs). A hypervisor, or Virtual Machine Monitor (VMM), is the low-level firmware or software layer that creates and manages virtual machines.
Hypervisors are classified into two primary categories: Type 1 (Bare-Metal) hypervisors and Type 2 (Hosted) hypervisors. Type 1 hypervisors execute directly on the bare-metal physical host hardware without an underlying host operating system (e.g., VMware ESXi, KVM, Xen, Microsoft Hyper-V). They provide superior performance, lower latency, and higher security isolation. Type 2 hypervisors run as an application process on top of an existing host operating system (e.g., VMware Workstation, Oracle VirtualBox).
Key virtualization paradigms include Full Virtualization (binary translation and hardware-assisted virtualization such as Intel VT-x and AMD-V), Paravirtualization (where the guest operating system kernel is modified to make hypercalls directly to the hypervisor for enhanced performance), and Operating System-level Virtualization or Containerization (such as Docker and Linux Containers / cgroups and namespaces), which shares the host OS kernel for lightweight, fast execution.

UNIT 3: DISTRIBUTED STORAGE AND MAPREDUCE COMPUTATION
Distributed storage systems provide scalable, fault-tolerant persistence across clusters of commodity hardware nodes. The Hadoop Distributed File System (HDFS) is designed based on the Google File System (GFS) architecture. HDFS adopts a master-slave architecture consisting of a single NameNode and multiple DataNodes. The NameNode manages the file system namespace, directory hierarchy, and metadata mapping file blocks to DataNodes. DataNodes store and retrieve data blocks as directed by the NameNode and periodically send heartbeats and block reports.
HDFS divides large files into uniform blocks (typically 128 MB or 256 MB) and replicates each block across multiple rack-aware DataNodes (default replication factor of 3) to ensure high availability and survive node failures.
MapReduce is a software framework and programming model for processing vast datasets in parallel using distributed clusters. Computation is structured into two primary functions: Map and Reduce. The Map function processes an input key-value pair and produces a set of intermediate key-value pairs. The framework then performs the Shuffle and Sort phase, grouping all intermediate values associated with the same key. The Reduce function accepts an intermediate key and its set of values, aggregating them to produce the final output dataset.

UNIT 4: CLOUD SECURITY, MULTI-TENANCY, AND GOVERNANCE
Cloud security addresses the technological, administrative, and procedural safeguards required to protect data, applications, and cloud infrastructure. Multi-tenancy introduces significant security challenges due to resource sharing among distinct organizations on identical physical infrastructure. Side-channel attacks, hypervisor escape vulnerabilities, and noisy neighbor interference represent notable multi-tenant threats.
Identity and Access Management (IAM) provides role-based access control (RBAC), multi-factor authentication (MFA), and least-privilege policy enforcement. Data security mandates robust encryption mechanisms for both Data at Rest (using AES-256 standard encryption keys managed via Hardware Security Modules or KMS) and Data in Transit (using TLS 1.3 cryptographic protocols).
Cloud governance involves regulatory compliance (such as GDPR, HIPAA, and ISO/IEC 27001), automated audit logging, continuous compliance monitoring, and service level agreement (SLA) contract enforcement defining availability, latency, and disaster recovery recovery point objectives (RPO) and recovery time objectives (RTO).

UNIT 5: SERVERLESS COMPUTING AND MICROSERVICES
Serverless computing, or Function-as-a-Service (FaaS), is an execution model where the cloud provider dynamically manages the allocation and provisioning of computing servers. Developers write modular, stateless functions that execute in response to discrete events (e.g., HTTP requests, database change streams, message queues, scheduled crons). Billing is strictly based on the actual execution duration and memory consumed rather than pre-allocated server capacity.
Key operational challenges in serverless architectures include Cold Start Latency (the initialization delay when a new container runtime container is spun up), execution timeouts, and statelessness requiring external distributed cache or state storage (e.g., Redis, DynamoDB).
Microservices architecture decomposes monolithic enterprise applications into a suite of small, autonomous, loosely coupled services communicating via lightweight protocols (RESTful APIs, gRPC, asynchronous event brokers like Apache Kafka). API Gateways serve as the single point of entry, handling request routing, rate limiting, SSL termination, and client token authentication.
`;

async function seedAcademicContent() {
  const checkDoc = db.prepare(`SELECT id FROM documents WHERE subject_name = ?`).get('Cloud Computing & Distributed Systems');
  if (checkDoc) return;

  console.log('Seeding initial academic syllabus and grounded questions...');

  const docId = 'doc_cloud_comp_001';
  const units = [
    'Unit 1: Cloud Architecture & Service Models',
    'Unit 2: Virtualization & Hypervisor Architecture',
    'Unit 3: Distributed Storage & MapReduce',
    'Unit 4: Cloud Security & Governance',
    'Unit 5: Serverless Computing & Microservices'
  ];

  db.prepare(`
    INSERT INTO documents (
      id, user_id, subject_name, subject_code, course_semester,
      academic_year, units, original_filename, file_type, file_size,
      file_path, extracted_text, chunk_count, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    docId,
    'usr_faculty_001',
    'Cloud Computing & Distributed Systems',
    'CS8041',
    'B.Tech CSE - Semester 6',
    '2026-2027',
    JSON.stringify(units),
    'CS8041_Cloud_Computing_Curriculum_Master.pdf',
    'pdf',
    48520,
    '',
    SAMPLE_DOCUMENT_TEXT,
    10,
    'indexed'
  );

  // Generate chunks
  const rawChunks = createChunks(SAMPLE_DOCUMENT_TEXT, 550, 80);
  for (let i = 0; i < rawChunks.length; i++) {
    const chunkText = rawChunks[i];
    const unitIdx = Math.min(units.length - 1, Math.floor((i / rawChunks.length) * units.length));
    const assignedUnit = units[unitIdx];
    const chunkId = `chk_cloud_${i + 1}`;
    const emb = await getEmbedding(chunkText);

    db.prepare(`
      INSERT INTO document_chunks (
        id, document_id, subject_name, subject_code, unit,
        chunk_index, content, token_count, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      chunkId,
      docId,
      'Cloud Computing & Distributed Systems',
      'CS8041',
      assignedUnit,
      i,
      chunkText,
      Math.round(chunkText.length / 4),
      JSON.stringify(emb)
    );
  }

  // Seed representative grounded questions demonstrating all Bloom levels, difficulties, types, and duplicate pairs
  const initialQuestions = [
    {
      id: 'q_seed_001',
      question_text: 'Define cloud computing and list the five essential characteristics specified by NIST.',
      question_type: 'short',
      options: null,
      correct_answer: null,
      model_answer: 'Cloud computing is an on-demand network access model to a shared pool of configurable computing resources. The 5 NIST characteristics are: 1) On-demand self-service, 2) Broad network access, 3) Resource pooling, 4) Rapid elasticity, and 5) Measured service.',
      explanation: 'Directly defined in NIST SP 800-145 and syllabus Unit 1.',
      marks: 2,
      difficulty: 'Easy',
      blooms_level: 'Remember',
      blooms_justification: 'Action verb "Define" and "List" targets knowledge retrieval and recall.',
      unit: 'Unit 1: Cloud Architecture & Service Models',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 1, Chunk #1]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    },
    {
      id: 'q_seed_002',
      question_text: 'What is meant by cloud computing? State its fundamental NIST characteristics.',
      question_type: 'short',
      options: null,
      correct_answer: null,
      model_answer: 'Cloud computing represents on-demand delivery of pooled configurable IT resources. Fundamental characteristics include self-service, broad network reach, multi-tenant resource pooling, elasticity, and metered billing.',
      explanation: 'Evaluates identical core concepts as q_seed_001. Flagged by Semantic Similarity Engine as high conceptual duplicate.',
      marks: 2,
      difficulty: 'Easy',
      blooms_level: 'Remember',
      blooms_justification: 'Tests fundamental recall of cloud definitions.',
      unit: 'Unit 1: Cloud Architecture & Service Models',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 1, Chunk #1]',
      status: 'approved',
      is_duplicate: 1,
      duplicate_of_id: 'q_seed_001',
      duplicate_score: 0.94,
      duplicate_notes: 'High conceptual equivalence detected (94% similarity). Near-duplicate of "Define cloud computing and list the five essential characteristics specified by NIST."'
    },
    {
      id: 'q_seed_003',
      question_text: 'Which of the following describes a Type 1 (Bare-Metal) Hypervisor?',
      question_type: 'mcq',
      options: JSON.stringify([
        '(A) Runs as a user-level application on top of a host operating system.',
        '(B) Executes directly on bare-metal physical host hardware without a host OS.',
        '(C) Requires specialized guest OS modification via direct hypercalls only.',
        '(D) Emulates CPU instructions via software binary translation exclusively.'
      ]),
      correct_answer: 'B',
      model_answer: 'Correct Option: (B)\nExecutes directly on bare-metal physical host hardware without a host OS.',
      explanation: 'Type 1 hypervisors (e.g., VMware ESXi, KVM) execute directly on physical hardware for superior I/O performance and latency isolation.',
      marks: 1,
      difficulty: 'Easy',
      blooms_level: 'Understand',
      blooms_justification: 'Requires comprehension of hypervisor classification tiers.',
      unit: 'Unit 2: Virtualization & Hypervisor Architecture',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 2, Chunk #3]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    },
    {
      id: 'q_seed_004',
      question_text: 'Differentiate between Type 1 and Type 2 Hypervisors with respect to performance, security isolation, and typical enterprise deployment scenarios.',
      question_type: 'short',
      options: null,
      correct_answer: null,
      model_answer: '1. Architecture: Type 1 runs on bare metal; Type 2 runs on top of host OS.\n2. Performance: Type 1 has near-native hardware access; Type 2 incurs OS overhead.\n3. Security: Type 1 has minimal attack surface; Type 2 relies on host OS security.\n4. Use Case: Type 1 in enterprise data centers; Type 2 in desktop client virtualization.',
      explanation: 'Core comparison testing structural virtualization distinctions.',
      marks: 4,
      difficulty: 'Medium',
      blooms_level: 'Analyze',
      blooms_justification: 'Requires comparing, contrasting, and categorizing structural differences.',
      unit: 'Unit 2: Virtualization & Hypervisor Architecture',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 2, Chunk #3]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    },
    {
      id: 'q_seed_005',
      question_text: 'Explain the master-slave architecture of HDFS. Describe how NameNode and DataNodes coordinate block storage and fault-tolerance.',
      question_type: 'long',
      options: null,
      correct_answer: null,
      model_answer: 'HDFS employs a single master NameNode managing file metadata, block mapping, and directory namespace, alongside distributed DataNodes storing actual 128/256 MB data blocks. DataNodes send regular heartbeat signals and block reports. Blocks are replicated (default factor 3) across rack-aware nodes to ensure fault tolerance upon hardware failure.',
      explanation: 'Detailed architectural decomposition of distributed file system design.',
      marks: 8,
      difficulty: 'Medium',
      blooms_level: 'Understand',
      blooms_justification: 'Requires synthesizing components, dataflow, and fault-tolerance protocols.',
      unit: 'Unit 3: Distributed Storage & MapReduce',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 3, Chunk #5]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    },
    {
      id: 'q_seed_006',
      question_text: 'Illustrate the execution flow of the MapReduce computation framework using a Word Count problem as an illustrative example. Clearly detail the Map, Shuffle, Sort, and Reduce phases.',
      question_type: 'long',
      options: null,
      correct_answer: null,
      model_answer: '1. Input Splitting: Data partitioned into logical splits.\n2. Map Phase: Emits intermediate (word, 1) key-value pairs.\n3. Shuffle & Sort: Framework collates and sorts pairs by key across cluster network.\n4. Reduce Phase: Sums frequencies for each unique key to produce (word, total_count).\n5. Output: Final aggregated dataset written back to HDFS.',
      explanation: 'Procedural application of distributed programming model.',
      marks: 10,
      difficulty: 'Hard',
      blooms_level: 'Apply',
      blooms_justification: 'Applies algorithm pipeline to a concrete distributed computing scenario.',
      unit: 'Unit 3: Distributed Storage & MapReduce',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 3, Chunk #6]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    },
    {
      id: 'q_seed_007',
      question_text: 'Critically evaluate the security implications of multi-tenancy in public cloud environments. Propose comprehensive isolation mechanisms for compute, storage, and network layers.',
      question_type: 'descriptive',
      options: null,
      correct_answer: null,
      model_answer: 'Evaluation covers: Hypervisor side-channel attacks (Spectre/Meltdown), noisy neighbor resource starvation, VLAN hopping, and shared storage leakage. Countermeasures include hardware-enforced virtualization boundaries, hardware security modules (HSM) for KMS encryption, VPC micro-segmentation, and rigorous IAM zero-trust policies.',
      explanation: 'High-level synthesis evaluating risks and constructing comprehensive security framework.',
      marks: 16,
      difficulty: 'Hard',
      blooms_level: 'Evaluate',
      blooms_justification: 'Action verb "Critically evaluate" and "Propose" requires judgment against security criteria.',
      unit: 'Unit 4: Cloud Security & Governance',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 4, Chunk #7]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    },
    {
      id: 'q_seed_008',
      question_text: 'Design a resilient serverless microservices backend architecture for an e-commerce transaction processing system. Address cold start latency mitigations and state management.',
      question_type: 'descriptive',
      options: null,
      correct_answer: null,
      model_answer: 'System design includes: API Gateway for rate limiting and JWT auth, AWS Lambda / Cloud Functions for stateless business logic, EventBridge / Kafka for asynchronous messaging, ElastiCache (Redis) for session state caching, and DynamoDB for ACID order persistence. Cold starts mitigated via provisioned concurrency and lightweight execution runtimes.',
      explanation: 'Creation tier synthesis assembling diverse architectural primitives into an end-to-end scalable solution.',
      marks: 16,
      difficulty: 'Hard',
      blooms_level: 'Create',
      blooms_justification: 'Requires designing and formulating an original enterprise architectural solution.',
      unit: 'Unit 5: Serverless Computing & Microservices',
      source_reference: 'CS8041_Cloud_Computing_Curriculum_Master.pdf [Unit 5, Chunk #9]',
      status: 'approved',
      is_duplicate: 0,
      duplicate_score: 0
    }
  ];

  const insertQ = db.prepare(`
    INSERT INTO questions (
      id, user_id, document_id, subject_name, subject_code, unit,
      question_text, question_type, options, correct_answer, model_answer,
      explanation, marks, difficulty, blooms_level, blooms_justification,
      source_reference, source_chunk_id, embedding, status,
      duplicate_of_id, duplicate_score, duplicate_notes, is_duplicate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of initialQuestions) {
    const emb = await getEmbedding(q.question_text);
    insertQ.run(
      q.id,
      'usr_faculty_001',
      docId,
      'Cloud Computing & Distributed Systems',
      'CS8041',
      q.unit,
      q.question_text,
      q.question_type,
      q.options,
      q.correct_answer,
      q.model_answer,
      q.explanation,
      q.marks,
      q.difficulty,
      q.blooms_level,
      q.blooms_justification,
      q.source_reference,
      'chk_cloud_1',
      JSON.stringify(emb),
      q.status,
      q.duplicate_of_id || null,
      q.duplicate_score || 0,
      q.duplicate_notes || null,
      q.is_duplicate || 0
    );
  }

  console.log('Seed academic materials and grounded questions completed successfully.');
}

module.exports = {
  seedAcademicContent
};
