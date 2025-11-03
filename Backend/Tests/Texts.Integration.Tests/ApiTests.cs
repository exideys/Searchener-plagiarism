using Xunit;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using FluentAssertions;
using Texts.Contracts;

namespace Texts.Api.Tests;

public class TextApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TextApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AnalyzeText_WithValidText_ShouldReturnOkAndCorrectStats()
    {
        var request = new AnalyzeTextRequest("aa bb aa");
        
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>();

        dto.Should().NotBeNull();
        dto!.Total.Should().Be(3);
        dto.Counts.Should().ContainKey("aa").WhoseValue.Should().Be(2);
    }

    [Fact]
    public async Task AnalyzeText_WithWhitespaceText_ShouldReturnBadRequest()
    {
        var request = new AnalyzeTextRequest(" ");
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ExtractShingles_WithValidRequest_ShouldReturnOkAndShingleStats()
    {
        var request = new ExtractShinglesRequest("one two three one two", 2);
        var response = await _client.PostAsJsonAsync("/text/shingles", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<ExtractShinglesResponse>();

        dto.Should().NotBeNull();
        dto!.Total.Should().Be(4);
        dto.Counts.Should().ContainKey("one two").WhoseValue.Should().Be(2);
        dto.Frequencies["one two"].Should().Be(0.5);
    }

    [Fact]
    public async Task ExtractShingles_WithInvalidK_ShouldReturnBadRequest()
    {
        var request = new ExtractShinglesRequest("some text", 0);
        var response = await _client.PostAsJsonAsync("/text/shingles", request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}