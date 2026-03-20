import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// --- Theme & Design System ---
class ChurchTheme {
  static const Color beigeLight = Color(0xFFFDFBF7);
  static const Color beigeWarm = Color(0xFFF5F2ED);
  static const Color blush = Color(0xFFFCE4EC);
  static const Color sage = Color(0xFFE8F5E9);
  static const Color gold = Color(0xFFD4AF37);
  static const Color deepBlue = Color(0xFF1A237E);

  static const TextStyle headingStyle = TextStyle(
    fontFamily: 'PlayfairDisplay', // Ensure this is in pubspec.yaml
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: deepBlue,
  );

  static const TextStyle bodyStyle = TextStyle(
    fontFamily: 'Inter', // Ensure this is in pubspec.yaml
    fontSize: 16,
    color: Colors.black87,
  );
}

// --- Public Home Screen ---
class PublicHomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChurchTheme.beigeLight,
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 60),
            Center(
              child: Column(
                children: [
                  Icon(Icons.auto_awesome, color: ChurchTheme.gold, size: 40), // Sparkle ✨
                  SizedBox(height: 16),
                  Text(
                    "Church Of Christ",
                    style: ChurchTheme.headingStyle.copyWith(fontSize: 40),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            SizedBox(height: 40),
            
            // Daily Devotion
            _buildDevotionCard(),
            SizedBox(height: 24),
            
            // Bible Verse
            _buildVerseCard(),
            SizedBox(height: 40),
            
            // Sermon PDFs
            Text("Recent Sermons", style: ChurchTheme.headingStyle.copyWith(fontSize: 24)),
            SizedBox(height: 16),
            _buildSermonList(),
            
            SizedBox(height: 40),
            
            // Navigation Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pushNamed(context, '/visit'),
                    icon: Icon(Icons.location_on),
                    label: Text("Visit Us"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ChurchTheme.deepBlue,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pushNamed(context, '/login'),
                    icon: Icon(Icons.login),
                    label: Text("Portal Login"),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: ChurchTheme.deepBlue,
                      side: BorderSide(color: ChurchTheme.deepBlue, width: 2),
                      padding: EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDevotionCard() {
    return Container(
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: ChurchTheme.beigeWarm),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_awesome, color: ChurchTheme.gold, size: 16),
              SizedBox(width: 8),
              Text("DAILY DEVOTION", style: TextStyle(letterSpacing: 2, fontSize: 12, fontWeight: FontWeight.bold, color: ChurchTheme.sage)),
            ],
          ),
          SizedBox(height: 16),
          Text(
            "\"In the quiet moments of the morning, we find the strength to face the day. Let your heart be filled with peace.\"",
            style: ChurchTheme.bodyStyle.copyWith(fontStyle: FontStyle.italic, fontSize: 18),
          ),
        ],
      ),
    );
  }

  Widget _buildVerseCard() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: ChurchTheme.beigeWarm,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          Icon(Icons.format_quote, color: ChurchTheme.gold.withOpacity(0.3), size: 40),
          Text(
            "The Lord is my shepherd; I shall not want.",
            style: ChurchTheme.headingStyle.copyWith(fontSize: 24),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 8),
          Text("— PSALM 23:1", style: TextStyle(color: ChurchTheme.gold, fontWeight: FontWeight.bold, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildSermonList() {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('sermons').orderBy('uploadDate', descending: true).limit(3).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return Center(child: CircularProgressIndicator());
        return Column(
          children: snapshot.data!.docs.map((doc) {
            return Card(
              margin: EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: ListTile(
                leading: CircleAvatar(backgroundColor: ChurchTheme.blush, child: Icon(Icons.picture_as_pdf, color: ChurchTheme.gold)),
                title: Text(doc['title'], style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(doc['author'] ?? 'Church Of Christ'),
                trailing: Icon(Icons.chevron_right),
                onTap: () => _launchURL(doc['pdfUrl']),
              ),
            );
          }).toList(),
        );
      },
    );
  }

  void _launchURL(String url) async {
    if (await canLaunch(url)) await launch(url);
  }
}

// --- Visit Screen ---
class VisitScreen extends StatelessWidget {
  final String address = "2nd floor, Ramanashree Chambers, 37, Lady Curzon Rd, Tasker Town, Shivaji Nagar, Bengaluru, Karnataka 560001, India";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ChurchTheme.beigeLight,
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0, iconTheme: IconThemeData(color: ChurchTheme.deepBlue)),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            Text("Join Our Community", style: ChurchTheme.headingStyle),
            SizedBox(height: 32),
            
            // Address Box
            _buildInfoBox(Icons.location_on, "Our Location", address, ChurchTheme.blush),
            SizedBox(height: 24),
            
            // Timings Box
            _buildInfoBox(Icons.access_time, "Service Timings", "Sun: 10:15 AM - 12:30 PM\nWed: 8:00 PM - 8:30 PM", ChurchTheme.sage),
            SizedBox(height: 40),
            
            // Map Hero
            GestureDetector(
              onTap: () => _launchMaps(),
              child: Container(
                height: 300,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(32),
                  image: DecorationImage(
                    image: NetworkImage("https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=800"),
                    fit: BoxFit.cover,
                    colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.3), BlendMode.darken),
                  ),
                ),
                child: Center(
                  child: Container(
                    padding: EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.location_pin, color: ChurchTheme.gold, size: 40),
                        SizedBox(height: 8),
                        Text("Find Your Way", style: TextStyle(fontWeight: FontWeight.bold, color: ChurchTheme.deepBlue)),
                        Text("Tap to open Google Maps", style: TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoBox(IconData icon, String title, String content, Color bgColor) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: ChurchTheme.beigeWarm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(backgroundColor: bgColor, child: Icon(icon, color: ChurchTheme.gold)),
          SizedBox(height: 16),
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: ChurchTheme.deepBlue)),
          SizedBox(height: 8),
          Text(content, style: ChurchTheme.bodyStyle.copyWith(fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }

  void _launchMaps() async {
    final url = "https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}";
    if (await canLaunch(url)) await launch(url);
  }
}
