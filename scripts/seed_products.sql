-- Seed Data for CafePilot

-- Categories
INSERT INTO categories (id, name) VALUES ('045d6172-2938-4471-bd5a-b5702e2154c9', 'VEGITABLE');
INSERT INTO categories (id, name) VALUES ('64f197d7-0cc0-4703-9c63-7c6a923578f8', 'SOUS');
INSERT INTO categories (id, name) VALUES ('a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'FROZEN');
INSERT INTO categories (id, name) VALUES ('17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'FRESH FRUIT / FROZEN');
INSERT INTO categories (id, name) VALUES ('57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'GENRAL STORE');
INSERT INTO categories (id, name) VALUES ('f9ec41e1-bdec-4613-85b1-43043ae55f50', 'POWDER');

-- Products
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4704be3f-fff5-4f35-8585-5391d05b8a18', 'PRD-137', 'KANDA PATTA', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('88f88156-2bd2-4703-87e7-7d92378fd34e', 'PRD-138', 'CRANBERRY', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('75f9df1b-443a-4a51-b621-3fcc2501b031', 'PRD-139', 'GARBAGE BAG', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('1988f159-00d7-4066-b4d2-ce1e36619f94', 'PRD-140', 'DRY FRUIT', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0d68f3a8-6019-4fc6-b3e3-eb4f85dae2f7', 'PRD-141', 'JAIN PANEER CHEES MOMO', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a64e59da-b943-45ab-9909-0e9e318578c0', 'PRD-142', 'TOMATO KETUP SESE', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('2fa68e86-611a-4d6a-9d20-9f9432b961b8', 'PRD-143', 'JUGNI', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('85350989-5174-429b-8667-f939ba662bac', 'PRD-144', 'ORANGE', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('0229f4d2-602e-4ce7-a7dd-02c8d77abd0e', 'PRD-145', 'SENITIZER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6462eee8-3cea-4154-a292-a2fc5b460d94', 'PRD-146', 'KIT KAT CHOCOLATE', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('88c065fa-8ca3-4e43-a51c-dcdec6a841f5', 'PRD-147', 'JAIN FRIES', 'a79bc6a7-f693-4a4a-9649-65c63bd90b6d', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3ad3fd28-c350-441d-b7b4-67cbe4c11e07', 'PRD-148', 'JAIN TOMATO KETUP SESE', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('776c6007-131b-411b-a0b4-784d5b47ae9e', 'PRD-149', 'CHINESH CABBAGE', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('c0a22cf8-a745-4285-bf4b-8db6b163a958', 'PRD-150', 'PINAPPLE', '17ebef37-8c6c-483d-83df-6d6c1ef33be5', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('79937ad5-c569-4650-a2db-ca862e53202e', 'PRD-151', 'DISH WASHER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('54e465e5-7ed1-4579-9616-7d1f3237b5f7', 'PRD-152', 'KIT  KAT CRUSH', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('3a03698a-1384-4c09-963b-15fdfc883c43', 'PRD-153', 'Chinese chilli sauce jain', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f147c379-c976-4c6d-b3cd-32203ddea7e9', 'PRD-154', 'RED CABBAGE', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('e38bced2-ad38-49dd-bee2-86e2f5527083', 'PRD-155', 'FLOR CLEANER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d2f16b7d-9707-4db4-8a9b-25cae7a37168', 'PRD-156', 'HONEY', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('5a0de5f6-b4c3-4c96-80a2-4dc4e2e47dfc', 'PRD-157', 'Soya sauce jain', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('acca1b0f-a4a2-44d2-bdbb-756d81a675ca', 'PRD-158', 'PALAK', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('b359ffe6-4610-4b41-b683-84840e88fffb', 'PRD-159', 'FORK', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('57aab981-8fce-418d-8db2-28382b7c844e', 'PRD-160', 'RICE', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d7743ebf-927b-4601-9f0b-9d375fdc0e62', 'PRD-161', 'SCHEZWAN SAUCE JAIN', '64f197d7-0cc0-4703-9c63-7c6a923578f8', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('aac7b2b0-58ff-4a4d-b090-75a482ad6cd3', 'PRD-162', 'POKCHO', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('a4836777-6d71-4836-a44b-39cba046873b', 'PRD-163', 'SPOON', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('24f4358f-74f5-4f81-bd8b-d3967bc4dadf', 'PRD-164', 'NOODLES', 'f9ec41e1-bdec-4613-85b1-43043ae55f50', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8e1330e8-d1cc-41df-a543-b5648e682b23', 'PRD-165', 'BEENS', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('80dd9b7d-39cb-4cb1-861e-1569fcd86f61', 'PRD-166', 'STRAW ALL TYPE', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('d6f666ec-0ff0-4dbc-93ae-8a4c069e2062', 'PRD-167', 'KACCHA BANANA', '045d6172-2938-4471-bd5a-b5702e2154c9', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('8770402c-97a5-4c01-8b8f-876a159f68ca', 'PRD-168', 'PIZZA BOX', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('083f588c-1070-423c-a642-aa5c4874850d', 'PRD-169', '500ML RCT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('4a682220-ba52-4039-8005-ee4da4507fba', 'PRD-170', '750ML RCT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6c639596-3dfe-4ff6-8ddb-a72be210c049', 'PRD-171', '500ML ROUND', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('9037e15f-e807-4132-8921-8b56d725c9c4', 'PRD-172', 'PARCEL BAG', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f3df26c8-b747-4a3d-a95c-c101c55d3f98', 'PRD-173', 'BURGER BOX', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('35090fbf-d26b-42b9-b612-2b359f5c7b0a', 'PRD-174', 'BUTTER PAPER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('f38741b5-278e-41e2-92e1-eda6269061f1', 'PRD-175', 'HAIR NUT', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('6866fb86-4647-40a7-a96a-08d614354f2a', 'PRD-176', 'FOIL PAPER', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
INSERT INTO products (id, code, name, category_id, unit, is_active) VALUES ('11055d96-c285-4793-a8d3-c094bfe8d832', 'PRD-177', 'CLEAN WRAP', '57f8ffa5-5f37-4054-b2b0-9a45148fb3ad', 'Unit', true);
