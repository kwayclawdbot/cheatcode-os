-- Seed initial creator list (YouTube finance channels to curate)
insert into creators (name, slug, platform, youtube_channel_id, quality_score, tags, description) values
    ('Mark Minervini', 'mark-minervini', 'youtube', 'UCq8LHQN2alCj_iJuVz3jwgQ', 0.95, '{"technical_analysis","swing_trading","VCP"}', 'SEPA methodology, VCP patterns, swing trading mastery'),
    ('Real Vision', 'real-vision', 'youtube', 'UCUL9mDz9FGs4uBnF-2MjiPw', 0.90, '{"macro","fundamentals","interviews"}', 'In-depth macro analysis and expert interviews'),
    ('tastytrade', 'tastytrade', 'youtube', 'UCFJPdBFvyGRWcUWTe27PCPA', 0.85, '{"options","day_trading","education"}', 'Options trading education and market analysis'),
    ('SMB Capital', 'smb-capital', 'youtube', 'UCMtIYMRHYjSzBMEMBnXoF4g', 0.90, '{"day_trading","prop_trading","education"}', 'Professional trading education from prop firm'),
    ('Humbled Trader', 'humbled-trader', 'youtube', 'UCcIvNGMBSQWMKP2cXQ-5bPA', 0.85, '{"day_trading","technical_analysis","psychology"}', 'Relatable day trading education'),
    ('Investors Podcast Network', 'investors-podcast', 'both', 'UCJph8_RLSNhHUWcFHTqDJXQ', 0.85, '{"fundamentals","macro","value_investing"}', 'Warren Buffett analysis and value investing'),
    ('Rayner Teo', 'rayner-teo', 'youtube', 'UCBUFwWDG2wiY6iO8sIXRkZQ', 0.80, '{"technical_analysis","swing_trading","education"}', 'Price action and technical analysis education'),
    ('Ziptrader', 'ziptrader', 'youtube', 'UC0ZOXKkTGS1PCZkCnq4E6Gw', 0.75, '{"swing_trading","growth","momentum"}', 'Growth stock analysis and momentum trading'),
    ('Warrior Trading', 'warrior-trading', 'youtube', 'UCGy7SkBjP5mopc4hMqedJbQ', 0.80, '{"day_trading","momentum","small_caps"}', 'Day trading small caps and momentum strategies'),
    ('Adam Khoo', 'adam-khoo', 'youtube', 'UC0SzH-2FjPYhNFNmmjbCGCg', 0.80, '{"technical_analysis","options","education"}', 'Professional trader education')
on conflict (slug) do nothing;
