-- Run this AFTER create_pending_users.cjs succeeds.
-- Links legacy tickets to the real (pending) accounts just created.
-- Disables the workflow trigger briefly since it blocks ANY update to an
-- APPROVED ticket, not just status changes (same issue as the product_id backfill).

ALTER TABLE public.tickets DISABLE TRIGGER ticket_workflow_trigger;

WITH mapping (legacy_name, user_id) AS (
  VALUES
  ('Support', '7b6f3af4-45a7-48e9-a71f-b8ff6ae1f472'),
  ('Firyal Mithalouni', 'f07cf790-60c4-4a55-91c4-af264a2c7032'),
  ('Feryal Mithalouni', 'f07cf790-60c4-4a55-91c4-af264a2c7032'),
  ('Husameddin', 'fe5c1353-0154-4396-9974-45cde6f7727a'),
  ('Husameddin Abubaker', 'fe5c1353-0154-4396-9974-45cde6f7727a'),
  ('Raed Mansour', 'ad251125-f0c6-4809-8b62-a3ed3f8025d9'),
  ('Braa Alsabaten', 'f803dec9-87f7-4d3b-8733-f39ade5a2fa6'),
  ('Mohammad Abedrabbu', 'b950143a-e503-49c3-a056-f2f6fc0d176e'),
  ('Hussam Daabes', '18e2d17e-d62f-427e-aac5-87c53f47123f'),
  ('Mohammad Al-Tarazi', '8621a937-dcf2-4860-af97-514d2ac6f7d4'),
  ('Afnan Alkatary', '7dd09e51-a462-4b46-ae28-afb058069a3d'),
  ('Mayada Abdelqader', 'a7071eef-7db8-47c7-a279-79ccd543bd49'),
  ('Abdallah Al- Omari', 'd11590ab-b2af-4e27-bade-e0a55a2eb0bf'),
  ('Mohammed Ramahi', 'e9e41ac0-4a34-4279-93f9-983c1a24cce3'),
  ('Fadi Salman', 'e50e0db2-2a3f-44a7-aaf0-69dead4fdb63'),
  ('Abdullah Abdelrazzaq', '306e7508-2724-4777-8d12-45cbe09a5243'),
  ('Mustafa Matalqah', 'dbdc8f53-9a37-4465-bc12-d63d9ff60714'),
  ('Banan Badwan', '9609cc80-8bd3-4046-88c2-3ab29919fed6'),
  ('Ayat Katrameez', 'a0da7e04-cbb4-4c49-b459-a2ebda5f2a5e'),
  ('Saif Aladli', '83e0aa1d-a078-4ef3-a46e-9c65542ac51e'),
  ('Ibrahem Mallah', '209ff636-39fc-4a87-98a5-2382e0e3c80f'),
  ('Samar Labib', 'a50e3967-4ee9-44a5-a587-87823b582545'),
  ('Mamoun Al Saras', '9e6ce6f1-06a4-40ac-9204-4b679e1b9c4c'),
  ('Mohammed Hasan', '16aeee71-35e6-455a-baf8-a4d800973bb7'),
  ('Mohammad Al-Shaikh', 'f9515c06-1133-4215-b0f3-e74ba31a1bac'),
  ('Asaad Omar', '6369007b-b32f-4c2f-bf7a-24f02bf28431'),
  ('Hausny AlBakry', '1da6ec5a-982d-4a70-8346-f3ae7cd8ece4'),
  ('Ruba Al-Khatib', '73b12cf9-a2a4-4e9e-80d4-e50a98ec8e70'),
  ('Mohammad Safi', 'd155eacf-fa46-476f-8a44-d2a5ad264bc3'),
  ('Husni Bakri', '115ad849-dd4c-4143-a6b0-b5eecaba9f6b'),
  ('Hitham Dawod', 'f051dfec-4610-4295-b40f-03ccfa066873'),
  ('Anas Al-Shawish', 'f4e73add-3d6a-4492-8b1f-de48928975f3'),
  ('Ruba Farhan', 'ed228a3f-7c7e-4920-a4ea-1424fa3a8fc4'),
  ('Nader Ibdeir', '7b5290ab-67b7-48b4-8cc6-f2d26257e5dc'),
  ('Ahmad Al-Nashwati', '90253ea5-8078-45be-ba1f-49bdfd69f340'),
  ('Rami Hajjiri', 'd0f6f250-d342-4363-8930-11302623630e'),
  ('Montaser Zaloom', '023c553a-66fb-4a75-af3b-dcb4c3ec7727'),
  ('Ammar Mosleh', 'b0b9176b-47b1-47f1-abc4-52e6ebf77e0b'),
  ('Malek Al-Jawaldeh', 'ab74f9f9-f724-43cd-965d-ff48fc5619ae'),
  ('Mohammad Al-Katry', '46b5c375-4bbc-4238-98e4-ac6668c5e012'),
  ('Alaa Elayyan', 'c5203547-e51a-42e9-bc1b-014dff9bd4f7'),
  ('Jehad Darwazeh', 'ee24b0d6-d757-4645-b114-59e2bb851abf'),
  ('Rima Al-Hamed', '2f05f7f2-5271-4627-af9b-a85ef955cbdb')
)
UPDATE public.tickets t
SET assigned_to = m.user_id::uuid
FROM mapping m
WHERE t.legacy_assigned_to = m.legacy_name;

ALTER TABLE public.tickets ENABLE TRIGGER ticket_workflow_trigger;
